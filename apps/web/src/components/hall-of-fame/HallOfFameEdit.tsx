/**
 * 殿堂の記入画面 — 招待を受けた本人だけが開く (Phase 5)。
 *
 * ## この画面の責務は「断れるようにすること」
 *
 * 招待の説明で最初に伝えるのは、書き方でも締め切りでもなく **辞退しても不利益が
 * 無いこと**。辞退のボタンは申請と同じ画面の同じ高さに置く (奥に隠さない)。
 *
 * 約束する内容は **実装が守れる範囲だけ** にする。辞退は運営の監査ログに残らず
 * (`routes/hall-of-fame.ts` の注記)、学習にも評価にも影響しない。ただし辞退したことは
 * 掲載の行の状態として残る — 同じ人へ招待を送り直さない (`nominate` が 409) ための
 * 最小限の記録で、運営の一覧にも「辞退」として名前が出る。「記録も残りません」とは
 * 書かない: 守れない約束は、断れなさをかえって強める。
 *
 * ## プレビューは公開時と同じ部品で描く
 *
 * `HallOfFameStory` を詳細ページと共有する。プレビューが別実装だと「載ってみたら
 * 見え方が違った」が起こり、同意した内容と公開されるものがずれる。
 *
 * ## 保存と申請を分ける
 *
 * 「下書きを保存」はいつでも押せて状態を動かさない。`submit` を送るのは
 * 「この内容で掲載を申請」だけで、そこが公開への同意点になる。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  EMPTY_HOF_CHAPTERS,
  HOF_CHAPTERS,
  HOF_CHAPTER_MAX,
  HOF_JOB_TITLE_MAX,
  HOF_QUOTE_MAX,
  canEditOwnEntry,
  isHofContentComplete,
  missingHofFields,
} from "@stella/shared/hall-of-fame/types";
import type { HallOfFameChapters, HallOfFameChapterKey } from "@stella/shared/hall-of-fame/types";

import { isBackendConfigured } from "@/lib/backend";
import {
  declineHallOfFame,
  getMyHallOfFameEntry,
  saveMyHallOfFameEntry,
  withdrawHallOfFame,
  type HallOfFameMine,
} from "@/lib/hall-of-fame-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { HallOfFameStory } from "@/components/hall-of-fame/HallOfFameDetail";
import { HofSurface } from "@/components/hall-of-fame/hof-ui";

interface Draft {
  jobTitle: string;
  quote: string;
  chapters: HallOfFameChapters;
}

const EMPTY_DRAFT: Draft = { jobTitle: "", quote: "", chapters: { ...EMPTY_HOF_CHAPTERS } };

function draftOf(entry: HallOfFameMine): Draft {
  return { jobTitle: entry.job_title, quote: entry.quote, chapters: { ...entry.chapters } };
}

/** 入力欄の下に出す残り字数 (上限に当たってから気づく、を避ける)。 */
function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length >= max;
  return (
    <span className={over ? "text-warning text-[11px]" : "text-ink-3 text-[11px]"}>
      {value.length} / {max}
    </span>
  );
}

export function HallOfFameEdit({ studentName }: { studentName: string }) {
  const navigate = useNavigate();
  const [entry, setEntry] = useState<HallOfFameMine | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"decline" | "withdraw" | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isBackendConfigured()) {
      setLoading(false);
      return () => undefined;
    }
    void (async () => {
      try {
        const mine = await getMyHallOfFameEntry();
        if (cancelled) return;
        setEntry(mine);
        setDraft(mine ? draftOf(mine) : EMPTY_DRAFT);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const missing = useMemo(
    () =>
      missingHofFields({ jobTitle: draft.jobTitle, quote: draft.quote, chapters: draft.chapters }),
    [draft],
  );
  const complete = isHofContentComplete({
    jobTitle: draft.jobTitle,
    quote: draft.quote,
    chapters: draft.chapters,
  });

  const save = useCallback(
    async (submit: boolean) => {
      if (!entry) return;
      setSaving(true);
      setError(null);
      try {
        const next = await saveMyHallOfFameEntry({
          id: entry.id,
          job_title: draft.jobTitle,
          quote: draft.quote,
          chapters: draft.chapters,
          submit,
        });
        setEntry(next);
        setDraft(draftOf(next));
        toast.success(submit ? "掲載を申請しました" : "下書きを保存しました");
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      } finally {
        setSaving(false);
      }
    },
    [draft, entry],
  );

  const close = useCallback(
    async (kind: "decline" | "withdraw") => {
      setSaving(true);
      setError(null);
      try {
        const next = kind === "decline" ? await declineHallOfFame() : await withdrawHallOfFame();
        setEntry(next);
        setConfirm(null);
        toast(kind === "decline" ? "招待を辞退しました" : "掲載を取り下げました");
        await navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      } finally {
        setSaving(false);
      }
    },
    [navigate],
  );

  if (loading) {
    return (
      <>
        <PageHeader title="殿堂への招待" />
        <Skeleton className="h-40 w-full" />
      </>
    );
  }

  // 招待が無い / もう終わっている招待。**理由は書き分けない** (辞退したことを
  // 画面が繰り返し告げないため)。
  if (!entry || (!canEditOwnEntry(entry.status) && entry.status !== "published")) {
    return (
      <>
        <PageHeader title="殿堂への招待" />
        <Card>
          <CardContent>
            <p className="text-[13px] text-ink-2">現在お受け取りいただいている招待はありません。</p>
            <Link
              to="/hall-of-fame"
              className="text-[12.5px] text-brand underline mt-3 inline-block"
            >
              殿堂を見る
            </Link>
          </CardContent>
        </Card>
      </>
    );
  }

  const published = entry.status === "published";
  const withdrawn = entry.status === "withdrawn";

  return (
    <>
      <PageHeader
        title="殿堂への招待"
        sub={
          published
            ? "あなたのストーリーは殿堂に掲載されています。"
            : withdrawn
              ? "掲載は取り下げ済みです。直して、もう一度掲載を申請できます。"
              : "運営があなたを殿堂へ推薦しました。掲載するかどうかは、あなたが決めます。"
        }
      />

      {/* 保存・申請の失敗は入力の続きに影響するので、支援技術へ即座に伝える。 */}
      {error ? (
        <p role="alert" className="text-sm text-destructive mb-3">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>この招待について</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-[12.5px] text-ink-2 leading-relaxed list-disc pl-5 flex flex-col gap-1">
              <li>
                掲載されるのは<strong className="text-foreground">実名</strong>
                と、あなたが書いた文章・ジョブ (名乗り)・修了したステージ名です。
              </li>
              <li>XPやレベル、順位のような数値は掲載されません。</li>
              <li>
                <strong className="text-foreground">辞退しても不利益はありません。</strong>
                辞退は運営の監査ログに残らず、学習にも評価にも影響しません。再度の招待は届きません。
              </li>
              <li>掲載後もいつでも取り下げられます。</li>
            </ul>
          </CardContent>
        </Card>

        {published ? (
          <Card>
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-[12.5px] text-ink-2">
                掲載中の内容は編集できません。直したいときは一度取り下げてください。
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <Button variant="outline" asChild>
                  <Link to="/hall-of-fame">殿堂を見る</Link>
                </Button>
                <Button variant="destructive" onClick={() => setConfirm("withdraw")}>
                  取り下げる
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>あなたのジョブ (名乗り)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium">
                    ジョブ
                    <span className="text-ink-3 font-normal">
                      {" "}
                      — 肩書きは自由です。自分で名乗りたい言葉を書いてください
                    </span>
                  </span>
                  <input
                    className="h-9 rounded-md border border-input bg-card px-3 text-[13px]"
                    value={draft.jobTitle}
                    maxLength={HOF_JOB_TITLE_MAX}
                    placeholder="例: 夜間バッチの番人"
                    onChange={(e) => setDraft((d) => ({ ...d, jobTitle: e.target.value }))}
                  />
                  <CharCount value={draft.jobTitle} max={HOF_JOB_TITLE_MAX} />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium">
                    引用
                    <span className="text-ink-3 font-normal">
                      {" "}
                      — 一覧と詳細に大きく出る 1 文です
                    </span>
                  </span>
                  <input
                    className="h-9 rounded-md border border-input bg-card px-3 text-[13px]"
                    value={draft.quote}
                    maxLength={HOF_QUOTE_MAX}
                    placeholder="例: 動かないコードの前で粘れる人になった。"
                    onChange={(e) => setDraft((d) => ({ ...d, quote: e.target.value }))}
                  />
                  <CharCount value={draft.quote} max={HOF_QUOTE_MAX} />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4つの章</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {HOF_CHAPTERS.map((chapter, i) => (
                  <label key={chapter.key} className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-medium">
                      <span className="text-brand mr-2">{String(i + 1).padStart(2, "0")}</span>
                      {chapter.label}
                    </span>
                    <span className="text-[11.5px] text-ink-3">{chapter.hint}</span>
                    <textarea
                      className="min-h-28 rounded-md border border-input bg-card px-3 py-2 text-[13px] leading-relaxed"
                      value={draft.chapters[chapter.key]}
                      maxLength={HOF_CHAPTER_MAX}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          chapters: {
                            ...d.chapters,
                            [chapter.key as HallOfFameChapterKey]: e.target.value,
                          },
                        }))
                      }
                    />
                    <CharCount value={draft.chapters[chapter.key]} max={HOF_CHAPTER_MAX} />
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>公開されたときの見え方</CardTitle>
              </CardHeader>
              <CardContent>
                <HofSurface>
                  <HallOfFameStory
                    name={studentName}
                    jobTitle={draft.jobTitle}
                    quote={draft.quote}
                    chapters={draft.chapters}
                    // 「歩んだ道」は公開のときにサーバが作る。プレビューでは、いま
                    // 分かっている範囲 (再申請なら前回の写し) をそのまま見せる。
                    path={entry.path_snapshot}
                  />
                </HofSurface>
                <p className="text-[11.5px] text-ink-3 mt-3">
                  「歩んだ道」は公開のときに、その時点で修了しているステージから自動で作られます。
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
              <div className="text-[12px] text-ink-3">
                {complete
                  ? entry.status === "submitted"
                    ? "申請済みです。公開までは書き直せます。"
                    : "すべて記入できています。"
                  : `未記入: ${missing.join(" / ")}`}
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button variant="ghost" disabled={saving} onClick={() => setConfirm("decline")}>
                  辞退する
                </Button>
                <Button variant="outline" disabled={saving} onClick={() => void save(false)}>
                  下書きを保存
                </Button>
                <Button
                  variant="accent"
                  disabled={saving || !complete}
                  onClick={() => void save(true)}
                >
                  この内容で掲載を申請
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => (open ? null : setConfirm(null))}>
        <DialogContent className="w-[min(calc(100vw-2rem),460px)]">
          <DialogHeader>
            <DialogTitle>
              {confirm === "withdraw" ? "掲載を取り下げますか?" : "招待を辞退しますか?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "withdraw"
                ? "殿堂からすぐに見えなくなります。取り下げは運営の監査ログに残らず、学習にも評価にも影響しません。"
                : "辞退は運営の監査ログに残らず、学習にも評価にも影響しません。再度の招待は届きません。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="default" onClick={() => setConfirm(null)}>
              やめる
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => void close(confirm === "withdraw" ? "withdraw" : "decline")}
            >
              {confirm === "withdraw" ? "取り下げる" : "辞退する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
