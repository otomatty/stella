import { Badge } from "@/components/ui/badge";
import type { StageContentPayload } from "@/lib/skill-map-api";
import { hasTasksOnly } from "@/lib/stage-content";

export function StageContentStats({
  content,
  maxProblems = 0,
}: {
  content?: StageContentPayload;
  maxProblems?: number;
}) {
  if (!content) return null;

  const stats = [
    { label: "課題", value: content.tasks, color: "text-brand-ink" },
    { label: "問題", value: content.problems, color: "text-brand-ink" },
    { label: "動画", value: content.videos, color: "text-ink-2" },
    { label: "知識問題", value: content.knowledge_questions, color: "text-ink-2" },
  ];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] tabular-nums">
        {stats.map(({ label, value, color }) => (
          <span key={label} className={value === 0 ? "text-ink-4" : color}>
            {label} {value.toLocaleString("ja-JP")}
          </span>
        ))}
        {content.planned_hours !== null ? (
          <span className={content.planned_hours === 0 ? "text-ink-4" : "text-ink-2"}>
            {content.planned_hours.toLocaleString("ja-JP")}h
          </span>
        ) : null}
        {hasTasksOnly(content) ? <Badge variant="warning">教材なし (課題のみ)</Badge> : null}
      </div>
      {maxProblems > 0 ? (
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-brand-soft">
          <div
            className="h-full rounded-full bg-brand-ink"
            style={{ width: `${(content.problems / maxProblems) * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
