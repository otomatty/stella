import { Link } from "@tanstack/react-router";
import type { TaskRefSummary } from "@stella/shared/tasks/problem-steps";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, Video } from "@/lib/icons";
import { taskRefText } from "@/lib/task-overview";
import { cn } from "@/lib/utils";

export function TaskReferences({ refs }: { refs?: readonly TaskRefSummary[] }) {
  if (!refs?.length) return null;
  return (
    <section aria-label="手がかり" className="space-y-2">
      <h2 className="text-sm font-bold">手がかり</h2>
      <Card>
        <ul className="divide-y divide-border">
          {refs.map((ref) => {
            const { video, metadata, completion, accessNote } = taskRefText(ref);
            const Icon = video ? Video : FileText;
            const classes = "flex items-start gap-3 px-4 py-3 text-sm";
            const content = (
              <>
                <Icon size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-ink" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold wrap-anywhere">{ref.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-2">{metadata}</span>
                  {accessNote ? (
                    <span className="mt-1 block text-xs text-ink-2">{accessNote}</span>
                  ) : null}
                </span>
                {completion ? <Badge variant="success">{completion}</Badge> : null}
              </>
            );
            return (
              <li key={`${ref.stageId}/${ref.lessonId}`}>
                {ref.accessible ? (
                  <Link
                    to="/stages/$stageId/lessons/$lessonId"
                    params={{ stageId: ref.stageId, lessonId: ref.lessonId }}
                    className={cn(
                      classes,
                      "hover:bg-sunken focus-visible:outline-ring focus-visible:-outline-offset-2",
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={classes}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
