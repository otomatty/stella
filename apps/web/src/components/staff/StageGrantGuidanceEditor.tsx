import { useId, useRef, useState } from "react";
import type {
  StageGrantGuidance,
  StageGrantGuidanceSummary,
} from "@stella/shared/stage-grants/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guidanceDate, guidancePayload } from "@/lib/guided-stages";
import { updateStageGrantGuidance } from "@/lib/stage-grants-api";

export function StageGrantGuidanceEditor({
  stageId,
  summary,
  count,
  pending,
  disabled,
  onSaved,
  onBusy,
}: {
  stageId: string;
  summary: StageGrantGuidanceSummary;
  count: number;
  pending: boolean;
  disabled: boolean;
  onSaved: (guidance: StageGrantGuidance) => void;
  onBusy: (busy: boolean) => void;
}) {
  const current = summary.uniform ? summary.guidance : null;
  const [sourceName, setSourceName] = useState(current?.source_name ?? "");
  const [date, setDate] = useState(current?.due_at ? guidanceDate(current.due_at) : "");
  const [message, setMessage] = useState(current?.message ?? "");
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  // 要約が更新されても結果表示を保つ。別の内容を受け取ったら入力欄も同期する。
  const summaryKey = JSON.stringify(summary);
  const [loadedSummary, setLoadedSummary] = useState(summaryKey);
  if (loadedSummary !== summaryKey) {
    setLoadedSummary(summaryKey);
    setSourceName(current?.source_name ?? "");
    setDate(current?.due_at ? guidanceDate(current.due_at) : "");
    setMessage(current?.message ?? "");
  }
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const save = async (clear: boolean) => {
    if (busyRef.current || pending || disabled || count === 0) return;
    setError(null);
    setSaved(null);
    try {
      const guidance = clear
        ? { source_name: null, due_at: null, message: null }
        : guidancePayload({ sourceName, date, message });
      busyRef.current = true;
      setBusy(true);
      onBusy(true);
      await updateStageGrantGuidance(stageId, { all: true, ...guidance });
      if (clear) {
        setSourceName("");
        setDate("");
        setMessage("");
      }
      setSaved(clear ? `${count} 人の案内を消しました` : `${count} 人に案内を入れました`);
      setExpanded(false);
      onSaved(guidance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "案内の保存に失敗しました");
    } finally {
      busyRef.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  const summaryText = !summary.uniform
    ? "人によって違います"
    : current?.source_name || current?.due_at || current?.message
      ? [
          current.source_name,
          current.due_at ? `期限 ${guidanceDate(current.due_at)}` : null,
          current.message,
        ]
          .filter(Boolean)
          .join("・")
      : "まだありません";
  return (
    <section
      aria-label="案内の内容"
      data-testid="stage-grant-guidance"
      className="m-3 rounded-lg border border-border p-3 text-xs"
    >
      <h3 className="font-bold">案内の内容</h3>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-ink-3" title={summaryText}>
          {summaryText}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          aria-expanded={expanded}
          aria-controls={panelId}
          disabled={busy}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "閉じる" : "案内を編集"}
        </Button>
      </div>
      {pending ? <p className="mt-2 text-warning">先に割り当ての変更を保存してください。</p> : null}
      {expanded ? (
        <fieldset
          id={panelId}
          disabled={pending || disabled || busy}
          className="mt-2 flex flex-col gap-2 disabled:opacity-60"
        >
          <label htmlFor="guidance-source">
            案内元の名前（80文字まで）
            <Input
              id="guidance-source"
              value={sourceName}
              maxLength={80}
              onChange={(e) => setSourceName(e.target.value)}
            />
          </label>
          <label htmlFor="guidance-date">
            期限（日本時間）
            <Input
              id="guidance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            案内の文（500文字まで）
            <textarea
              className="block min-h-16 w-full rounded-md border border-input bg-card p-2"
              value={message}
              maxLength={500}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <p>割り当て済みの全員（{count} 人）に反映します。すべての欄は任意です。</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={count === 0} onClick={() => void save(false)}>
              割り当て済みの全員に入れる
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={count === 0}
              onClick={() => void save(true)}
            >
              案内を消す
            </Button>
          </div>
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="mt-2 text-success">
          {saved}
        </p>
      ) : null}
    </section>
  );
}
