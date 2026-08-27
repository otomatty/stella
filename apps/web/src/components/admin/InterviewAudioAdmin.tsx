/**
 * 面談対策 — 質問読み上げ音声の管理 (admin)。
 *
 * 読み上げ (既定 Grok TTS / AI Gateway) の生成はコストがかかるため、 受講者リクエスト時の
 * 都度生成はせず、 この画面から admin が指定した質問だけ生成 / 再生成して R2 に登録する。
 * 受講者側は登録済みの音声だけ再生できる。
 *
 * Issue #234 で対話ログ UI が深掘り①〜③も音声で流すようになったため、 生成対象は
 * 「質問 1 件」ではなく質問文 + 本文のある深掘りの各セグメント。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Sparkles, Volume2 } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import {
  type InterviewAudioPart,
  type InterviewAudioSegment,
  interviewAudioSegmentId,
  interviewAudioSegments,
  INTERVIEW_TTS_MODEL_OPTIONS,
  isInterviewTtsModelId,
  type InterviewTtsModelId,
} from "@falcon/shared/interview/audio";
import {
  type AudioSegmentRef,
  type GenerateAudioResult,
  fetchInterviewQuestions,
  fetchQuestionAudio,
  formatAudioGenerateErrors,
  generateQuestionAudio,
} from "@/lib/interview-prep-api";
import { cn } from "@/lib/utils";

/** API 側の 1 リクエスト上限 (TTS_BATCH_LIMIT) に合わせる (セグメント数)。 */
const BATCH = 10;

type StatusFilter = "all" | "missing" | "stale" | "registered";

/** 試聴ボタンの表示名 (質問文 + 深掘り①〜③)。 */
const SEGMENT_LABELS: Record<InterviewAudioPart, string> = {
  question: "試聴",
  deep1: "深①",
  deep2: "深②",
  deep3: "深③",
};

export function InterviewAudioAdmin() {
  const [rows, setRows] = useState<InterviewQuestion[]>([]);
  /** 登録済みセグメント (`12:question` / `12:deep1`)。 */
  const [audioSet, setAudioSet] = useState<Set<string>>(new Set());
  /**
   * 登録済みだが本文と食い違うセグメント (Issue #237)。 質問を編集すると
   * サーバが音声を作り直すが、 読み上げが未設定・失敗したときはここに残る。
   */
  const [staleSet, setStaleSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [busyNos, setBusyNos] = useState<Set<number>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  /** 試聴中のセグメント (`12:deep1`)。 深掘りも 1 つずつ聞けるようにする。 */
  const [playingId, setPlayingId] = useState<string | null>(null);
  /** 空は env の INTERVIEW_TTS_MODEL (未指定なら Grok)。 セレクトで上書きする。 */
  const [ttsModel, setTtsModel] = useState<InterviewTtsModelId | "">("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /**
   * 試聴リクエストの世代番号。 fetch 中に別の質問を試聴すると audioRef はまだ空で
   * pause できず、 先の取得が後から解決して 2 つの音声が重なって鳴る。 再生直前に
   * 自分が最新のリクエストかを照合して、 古いものは URL を解放して捨てる。
   */
  const playRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchInterviewQuestions()
      .then((r) => {
        if (cancelled) return;
        setRows(r.rows);
        setAudioSet(new Set(r.audioSegments));
        setStaleSet(new Set(r.audioStaleSegments));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      // 世代を進めて取得中の試聴を無効化する。 pause() だけだと、 fetch 中に
      // アンマウントした場合 audioRef はまだ空で、 後から解決した音声が
      // 画面を離れたあとに鳴り出してしまう。
      playRequestRef.current++;
      audioRef.current?.pause();
    };
  }, []);

  /** 質問番号 → 生成対象セグメント (質問文 + 本文のある深掘り)。 */
  const segmentsByNo = useMemo(() => {
    const map = new Map<number, InterviewAudioSegment[]>();
    for (const r of rows) map.set(r.no, interviewAudioSegments(r));
    return map;
  }, [rows]);

  const allSegments = useMemo(() => [...segmentsByNo.values()].flat(), [segmentsByNo]);

  const missing = useMemo(
    () => allSegments.filter((seg) => !audioSet.has(interviewAudioSegmentId(seg.no, seg.part))),
    [allSegments, audioSet],
  );

  /** 登録済みだが本文と食い違うセグメント。 未登録とは別に数え、 別ボタンで作り直す。 */
  const stale = useMemo(
    () => allSegments.filter((seg) => staleSet.has(interviewAudioSegmentId(seg.no, seg.part))),
    [allSegments, staleSet],
  );

  /** その質問に古い音声が残っているか (行のバッジと絞り込みで使う)。 */
  const hasStale = (no: number): boolean =>
    (segmentsByNo.get(no) ?? []).some((seg) =>
      staleSet.has(interviewAudioSegmentId(seg.no, seg.part)),
    );

  /** その質問のセグメントが何件登録済みか。 */
  const registeredCount = (no: number): number =>
    (segmentsByNo.get(no) ?? []).filter((seg) =>
      audioSet.has(interviewAudioSegmentId(seg.no, seg.part)),
    ).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const segments = segmentsByNo.get(r.no) ?? [];
      const done = segments.filter((seg) =>
        audioSet.has(interviewAudioSegmentId(seg.no, seg.part)),
      ).length;
      const complete = segments.length > 0 && done === segments.length;
      const outdated = segments.some((seg) =>
        staleSet.has(interviewAudioSegmentId(seg.no, seg.part)),
      );
      if (filter === "missing" && complete) return false;
      if (filter === "stale" && !outdated) return false;
      if (filter === "registered" && !complete) return false;
      if (!q) return true;
      return r.question.toLowerCase().includes(q) || String(r.no) === q;
    });
  }, [rows, audioSet, staleSet, filter, query, segmentsByNo]);

  /** 指定セグメントを生成し、 成功分を登録済みへ反映する。 失敗行を返す。 */
  const generate = async (targets: AudioSegmentRef[]): Promise<GenerateAudioResult["results"]> => {
    const nos = targets.map((t) => t.no);
    setBusyNos((s) => new Set([...s, ...nos]));
    try {
      const { results } = await generateQuestionAudio(targets, ttsModel || undefined);
      const ok = results.filter((r) => r.ok).map((r) => interviewAudioSegmentId(r.no, r.part));
      if (ok.length > 0) {
        setAudioSet((s) => new Set([...s, ...ok]));
        // 作り直せたぶんは今の本文で録り直したので、 古い印を落とす。
        setStaleSet((s) => {
          const next = new Set(s);
          for (const id of ok) next.delete(id);
          return next;
        });
      }
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) console.error("[interview-tts] generate failed", failed);
      return results;
    } finally {
      setBusyNos((s) => {
        const next = new Set(s);
        for (const no of nos) next.delete(no);
        return next;
      });
    }
  };

  /** 1 問ぶん (質問文 + 深掘り) をまとめて生成 / 再生成する。 */
  const generateOne = async (no: number) => {
    const segments = segmentsByNo.get(no) ?? [];
    if (segments.length === 0) return;
    const regenerate = registeredCount(no) > 0;
    try {
      const results = await generate(segments.map(({ no: n, part }) => ({ no: n, part })));
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) toast.error(formatAudioGenerateErrors(failed));
      else toast(`No.${no} の音声を${regenerate ? "再生成" : "生成"}しました`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "音声生成に失敗しました");
    }
  };

  /** まとめて生成。 API 上限に合わせて 10 セグメントずつ直列で送る。 */
  const generateBulk = async (segments: InterviewAudioSegment[], verb: string) => {
    const targets: AudioSegmentRef[] = segments.map(({ no, part }) => ({ no, part }));
    if (targets.length === 0) return;
    setBulk({ done: 0, total: targets.length });
    const failures: GenerateAudioResult["results"] = [];
    try {
      for (let i = 0; i < targets.length; i += BATCH) {
        const chunk = targets.slice(i, i + BATCH);
        const results = await generate(chunk);
        failures.push(...results.filter((r) => !r.ok));
        setBulk({ done: Math.min(i + chunk.length, targets.length), total: targets.length });
      }
      if (failures.length > 0) toast.error(formatAudioGenerateErrors(failures));
      else toast(`${targets.length} 件の音声を${verb}しました`);
    } catch (e) {
      // レート制限 (429) などで中断しても、 成功済みは登録に反映されている。
      const extra = e instanceof Error ? e.message : "一括生成が中断しました";
      toast.error(failures.length > 0 ? `${formatAudioGenerateErrors(failures)}\n${extra}` : extra);
    } finally {
      setBulk(null);
    }
  };

  const play = async (no: number, part: InterviewAudioPart) => {
    // 進行中の取得を無効化してから、 鳴っている音声を止める。
    const request = ++playRequestRef.current;
    const id = interviewAudioSegmentId(no, part);
    audioRef.current?.pause();
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    try {
      const blob = await fetchQuestionAudio(no, part);
      const url = URL.createObjectURL(blob);
      // 取得中に別の試聴が始まっていたら、 この音声は鳴らさず捨てる。
      if (playRequestRef.current !== request) {
        URL.revokeObjectURL(url);
        return;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingId((cur) => (cur === id ? null : cur));
      };
      await audio.play();
      if (playRequestRef.current !== request) {
        audio.pause();
        URL.revokeObjectURL(url);
        return;
      }
      setPlayingId(id);
    } catch (e) {
      if (playRequestRef.current !== request) return;
      toast.error(e instanceof Error ? e.message : "再生に失敗しました");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonRows rows={5} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-12 text-center text-sm text-destructive">
        質問一覧の取得に失敗しました: {error}
      </Card>
    );
  }

  const btn =
    "px-2.5 py-1 rounded-sm border border-border text-[12px] cursor-pointer hover:bg-sunken inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-default";

  return (
    <>
      {audioSet.size === 0 ? (
        <Card className="p-3 mb-3 border-warning/40 bg-warning/10 text-[12.5px] leading-relaxed">
          <b>まず 1 問だけ生成して試聴してください。</b> 読み上げモデルは下のセレクトで切り替えます
          (未指定はサーバの <span className="font-mono text-[11.5px]">INTERVIEW_TTS_MODEL</span>、
          無ければ Grok TTS)。 声色が想定と違う場合は{" "}
          <span className="font-mono text-[11.5px]">INTERVIEW_TTS_VOICE</span>{" "}
          を変更してから生成してください。
        </Card>
      ) : null}
      <Card className="p-3 mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] text-ink-2">
            登録済み <b>{allSegments.length - missing.length}</b> / 全 {allSegments.length}{" "}
            セグメント (質問文 + 深掘り、 全 {rows.length} 問)
            {stale.length > 0 ? (
              <>
                {" "}
                — うち <b className="text-warning-foreground">{stale.length}</b> 件は本文が更新済み
              </>
            ) : null}
          </span>
          <label
            className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-2"
            htmlFor="interview-tts-model"
          >
            モデル
            <select
              id="interview-tts-model"
              value={ttsModel}
              disabled={bulk !== null}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || isInterviewTtsModelId(v)) setTtsModel(v);
              }}
              className="h-7 rounded-sm border border-border bg-card px-2 text-[12px]"
            >
              <option value="">環境の既定</option>
              {INTERVIEW_TTS_MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {/* 質問編集からの作り直しが落ちたぶんの復旧口。 未登録の生成とは分けて数える。 */}
          <button
            type="button"
            className={btn}
            disabled={bulk !== null || stale.length === 0}
            onClick={() => void generateBulk(stale, "再生成")}
          >
            {bulk ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            {stale.length === 0 ? "古い音声なし" : `古い音声を再生成 (${stale.length} 件)`}
          </button>
          <button
            type="button"
            className={btn}
            disabled={bulk !== null || missing.length === 0}
            onClick={() => void generateBulk(missing, "生成")}
          >
            {bulk ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {bulk
              ? `生成中… ${bulk.done}/${bulk.total}`
              : missing.length === 0
                ? "未登録なし"
                : `未登録をまとめて生成 (${missing.length} 問)`}
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ["all", "すべて"],
              ["missing", "未登録"],
              ["stale", "音声が古い"],
              ["registered", "登録済み"],
            ] as const
          ).map(([key, label]) => (
            <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </Chip>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="質問文・番号で検索"
            className="h-8 text-[13px] max-w-xs ml-auto"
          />
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-3">条件に合う質問がありません。</Card>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((r) => {
            const segments = segmentsByNo.get(r.no) ?? [];
            const done = registeredCount(r.no);
            const registered = segments.length > 0 && done === segments.length;
            const playable = segments.filter((seg) =>
              audioSet.has(interviewAudioSegmentId(seg.no, seg.part)),
            );
            const busy = busyNos.has(r.no);
            return (
              <Card key={r.no} className="p-3 flex items-center gap-3">
                <span className="text-[11.5px] text-ink-4 tabular-nums w-8 shrink-0">{r.no}</span>
                <span
                  className={cn(
                    "text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0",
                    registered ? "bg-brand/10 text-brand" : "bg-muted text-ink-3",
                  )}
                >
                  {registered ? "登録済み" : `${done}/${segments.length}`}
                </span>
                {hasStale(r.no) ? (
                  <span
                    className="text-[10.5px] px-1.5 py-[1px] rounded font-semibold shrink-0 bg-warning/20 text-warning-foreground inline-flex items-center gap-1"
                    title="質問文が更新されており、 音声が追いついていません"
                  >
                    <AlertTriangle size={11} />
                    音声が古い
                  </span>
                ) : null}
                <span className="flex-1 min-w-0 text-[13px] truncate" title={r.question}>
                  {r.question}
                </span>
                {/* 登録済みセグメントはそれぞれ試聴できる (深掘りも配信前に確認する) */}
                {playable.map((seg) => {
                  const id = interviewAudioSegmentId(seg.no, seg.part);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={btn}
                      onClick={() => void play(seg.no, seg.part)}
                      aria-label={`No.${r.no} の${SEGMENT_LABELS[seg.part]}を試聴`}
                    >
                      <Volume2 size={12} />
                      {playingId === id ? "停止" : SEGMENT_LABELS[seg.part]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={btn}
                  disabled={busy || bulk !== null}
                  onClick={() => void generateOne(r.no)}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {registered ? "再生成" : "生成"}
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
