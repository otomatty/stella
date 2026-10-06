/**
 * 週次の育成メモ (#38・07 §6.5)。担当講師が 5 分で読み、その場で一言の声掛けかペースの調整をする。
 * 講師ダッシュボード (今担当している受講者) と、管理者のダッシュボード (テナントの全員) に置く。
 *
 * - メモは講師向け。受講者本人には見せない (API も講師・管理者にしか返さない)。
 * - 一言は講師が直してから送る。送るのは講師が書いた文だけ (受講者への通知)。
 * - ペースの調整は既存の学習ペースの編集 (`LearningPacePanel`) をそのまま使い、保存したら対応として残す。
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MEMO_ACTION_LABELS,
  MEMO_MESSAGE_MAX,
  type MemoAction,
  type MentorMemoView,
  materialFacts,
} from "@stella/shared/mentoring/weekly-memo";
import { addStudyDays } from "@stella/shared/study/activity";
import { apiFetch } from "@/lib/api-client";
import { ChevronLeft, ChevronRight, Send } from "@/lib/icons";
import { LearningPacePanel } from "@/components/learner/LearningPacePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type MemoAudience, memosForWeek, weeklyMemoIntro } from "./weekly-memo-view";

interface MemoList {
  week: string;
  weekEnd: string;
  memos: MentorMemoView[];
}

const date = (value: string) => value.replaceAll("-", "/");

function formatAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function WeeklyMemoPanel({ audience = "assigned" }: { audience?: MemoAudience }) {
  const intro = weeklyMemoIntro(audience);
  const [week, setWeek] = useState<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [data, setData] = useState<MemoList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await apiFetch<MemoList>(
          `/api/mentor-memos${week ? `?week=${encodeURIComponent(week)}` : ""}`,
          { signal },
        );
        if (signal?.aborted) return;
        setData(result);
        setError(null);
        if (!week) setLatest(result.week);
      } catch (err) {
        if (!signal?.aborted)
          setError(err instanceof Error ? err.message : "育成メモを取得できませんでした");
      }
    },
    [week],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  // 見出し・操作は求めた週に合わせる。週を切り替えて取得している間は、前の週のメモを出さない。
  const shown = week ?? data?.week ?? null;
  const memos = memosForWeek(data, week);
  const goTo = (next: string) => {
    setError(null);
    setWeek(next);
  };
  const replace = (memo: MentorMemoView) =>
    setData((d) =>
      d && d.week === memo.weekStart
        ? { ...d, memos: d.memos.map((m) => (m.id === memo.id ? memo : m)) }
        : d,
    );
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>週次の育成メモ</CardTitle>
        <CardActions>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="前の週"
            disabled={!shown}
            onClick={() => shown && goTo(addStudyDays(shown, -7))}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-ink-3">
            {shown ? `${date(shown)}〜${date(addStudyDays(shown, 6))}` : ""}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="次の週"
            disabled={!shown || !latest || shown >= latest}
            onClick={() => shown && goTo(addStudyDays(shown, 7))}
          >
            <ChevronRight size={14} />
          </Button>
        </CardActions>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-ink-3">
          {intro.scope}
          予定と実績の差・スキル・つまずき・支援・レビューの結果から AI が書きます
          (使えないときは記録からの機械的な要約)。受講者には見せません。
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!memos && !error ? <p className="text-sm text-ink-3">読み込んでいます</p> : null}
        {memos && memos.length === 0 ? <p className="text-sm text-ink-3">{intro.empty}</p> : null}
        {memos?.map((memo) => (
          <MemoItem key={memo.id} memo={memo} onChanged={replace} />
        ))}
      </CardContent>
    </Card>
  );
}

function MemoItem({
  memo,
  onChanged,
}: {
  memo: MentorMemoView;
  onChanged: (memo: MentorMemoView) => void;
}) {
  const [open, setOpen] = useState<"message" | "pace" | null>(null);
  const [message, setMessage] = useState(memo.messageDraft ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (kind: MemoAction, text?: string) => {
    setSaving(true);
    try {
      const result = await apiFetch<{ memo: MentorMemoView }>(
        `/api/mentor-memos/${encodeURIComponent(memo.id)}/actions`,
        { method: "POST", body: { kind, ...(text === undefined ? {} : { message: text }) } },
      );
      onChanged(result.memo);
      setError(null);
      setOpen(null);
      toast.success(
        kind === "message" ? "一言を送りました" : `「${MEMO_ACTION_LABELS[kind]}」を記録しました`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "対応を記録できませんでした");
    } finally {
      setSaving(false);
    }
  };
  if (memo.state !== "ready")
    return (
      <section className="border border-border rounded-md p-3">
        <div className="text-sm font-medium">{memo.learnerName}</div>
        <p className="text-sm text-ink-3 mt-1">
          {memo.state === "failed"
            ? "この週のメモを作れませんでした。学習のペースと課題ごとの支援の記録を直接確認してください。"
            : "メモを作成しています。しばらくしてから開いてください。"}
        </p>
      </section>
    );
  return (
    <section className="border border-border rounded-md p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{memo.learnerName}</span>
        {memo.suggestedAction ? (
          <Badge variant={memo.suggestedAction === "watch" ? "default" : "warning"}>
            おすすめ: {MEMO_ACTION_LABELS[memo.suggestedAction]}
          </Badge>
        ) : null}
        {memo.handledAt ? <Badge variant="success">対応済み</Badge> : <Badge>未対応</Badge>}
        {memo.source === "fallback" ? (
          <span className="text-xs text-ink-3">記録からの機械的な要約</span>
        ) : null}
      </div>
      {memo.summary ? <p className="text-sm">{memo.summary}</p> : null}
      {memo.observations.length ? (
        <ul className="list-disc pl-5 text-sm space-y-0.5">
          {memo.observations.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      ) : null}
      {memo.actionReason ? <p className="text-xs text-ink-2">{memo.actionReason}</p> : null}
      {memo.material ? (
        <details>
          <summary className="cursor-pointer text-xs font-semibold">材料 (集計した記録)</summary>
          <ul className="mt-1 text-xs text-ink-3 space-y-0.5">
            {materialFacts(memo.material).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {memo.actions.length ? (
        <ul className="text-xs text-ink-3 space-y-0.5">
          {memo.actions.map((a) => (
            <li key={`${a.kind}:${a.at}`}>
              {formatAt(a.at)} · {MEMO_ACTION_LABELS[a.kind]}
              {a.detail ? ` · ${a.detail}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={open === "message" ? "primary" : "default"}
          onClick={() => setOpen(open === "message" ? null : "message")}
        >
          一言を送る
        </Button>
        <Button
          size="sm"
          variant={open === "pace" ? "primary" : "default"}
          onClick={() => setOpen(open === "pace" ? null : "pace")}
        >
          ペースを調整する
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => void act("watch")}>
          様子見にする
        </Button>
      </div>
      {open === "message" ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act("message", message);
          }}
        >
          <Label htmlFor={`memo-message-${memo.id}`}>受講者への一言</Label>
          <Textarea
            id={`memo-message-${memo.id}`}
            value={message}
            maxLength={MEMO_MESSAGE_MAX}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-xs text-ink-3">
            AI の案です。自分の言葉に直してから送ってください。受講者には通知として届きます。
          </p>
          <Button type="submit" size="sm" variant="primary" disabled={saving || !message.trim()}>
            <Send size={12} />
            {saving ? "送っています…" : "送る"}
          </Button>
        </form>
      ) : null}
      {open === "pace" ? (
        <LearningPacePanel userId={memo.learnerId} onSaved={() => act("pace")} />
      ) : null}
    </section>
  );
}
