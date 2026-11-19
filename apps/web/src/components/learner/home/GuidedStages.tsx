import { useRef, useState } from "react";
import type { GuidedStage } from "@stella/shared/stage-grants/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { guidedDeadline, guidedStageCard, guidedStageLineTitle } from "@/lib/guided-stages";
import { cn } from "@/lib/utils";

export function GuidedStageCard({
  stage,
  hideAction = false,
  onStart,
  onOpen,
}: {
  stage: GuidedStage;
  hideAction?: boolean;
  onStart: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const card = guidedStageCard(stage);
  const start = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await onStart(stage.stage_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "開始に失敗しました");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <article
      id={`guided-stage-${stage.stage_id}`}
      tabIndex={-1}
      data-testid="guide-guided-stage"
      className="flex flex-col gap-2 rounded-xl border border-border bg-sunken/50 p-3 focus-visible:outline-2 focus-visible:outline-brand"
    >
      {stage.source_name ? (
        <p className="text-xs text-ink-3">{stage.source_name} からの案内</p>
      ) : null}
      <h3 className="text-sm font-bold">{stage.title}</h3>
      <GuidedDeadline dueAt={stage.due_at} />
      <p className="text-xs text-ink-2">{card.progress}</p>
      <Progress
        value={card.percent}
        aria-valuenow={card.percent}
        className="h-1"
        aria-label={`${stage.title}の進み具合 ${card.progress}`}
      />
      {stage.message ? (
        <p className="whitespace-pre-wrap break-words text-xs text-ink-2">{stage.message}</p>
      ) : null}
      {card.prerequisite ? <p className="text-xs text-ink-3">{card.prerequisite}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      {card.button && !hideAction ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => (stage.status === "available" ? void start() : onOpen(stage.stage_id))}
        >
          {busy ? "開始しています…" : card.button}
        </Button>
      ) : null}
    </article>
  );
}

export function GuidedDeadline({ dueAt }: { dueAt: string | null }) {
  const deadline = guidedDeadline(dueAt);
  if (!deadline) return null;
  return (
    <p className={cn("text-xs", deadline.urgent ? "font-bold text-danger" : "text-ink-2")}>
      {deadline.days > 0 && deadline.urgent ? "期限間近：" : ""}
      {deadline.text}
    </p>
  );
}

export function GuidedStageLines({
  stages,
  onExpand,
}: {
  stages: GuidedStage[];
  onExpand: (id: string) => void;
}) {
  if (!stages.length) return null;
  return (
    <div
      data-testid="guide-guided-lines"
      className="max-h-[35dvh] shrink overflow-y-auto border-b border-border"
    >
      {stages.map((stage) => {
        const deadline = guidedDeadline(stage.due_at);
        return (
          <button
            type="button"
            key={stage.stage_id}
            onClick={() => onExpand(stage.stage_id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-sunken"
            title={stage.title}
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {guidedStageLineTitle(stage)}
            </span>
            <span
              className={cn(
                "shrink-0 text-[10px] text-ink-3",
                deadline?.urgent && "font-bold text-danger",
              )}
            >
              {deadline ? `${deadline.short}・` : ""}
              {guidedStageCard(stage).progress}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function GuidedStagesLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div role="alert" data-testid="guide-guided-error" className="p-3 text-xs text-danger">
      <p>{message}</p>
      <Button
        size="sm"
        variant="ghost"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await onRetry();
          } finally {
            setLoading(false);
          }
        }}
      >
        もう一度読み込む
      </Button>
    </div>
  );
}
