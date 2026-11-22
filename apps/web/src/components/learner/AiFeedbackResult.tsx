import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AiFeedbackView } from "@/lib/ai-feedback-view";
import { AlertCircle, ArrowLeft, Check, Circle, RefreshCw, X } from "@/lib/icons";
import { OpenInVscodeButton } from "./OpenInVscodeButton";

const cardStyle = "min-w-0 space-y-4 rounded-xl p-4 sm:p-6";
const insetStyle = "rounded-lg border border-border bg-sunken px-3 py-2.5 sm:px-4 sm:py-3";
const checklistStyle = {
  met: { Icon: Check, iconClass: "text-success", labelClass: "text-ink-2" },
  "required-fix": {
    Icon: ArrowLeft,
    iconClass: "rotate-180 text-warning",
    labelClass: "font-semibold dark:text-warning",
  },
  "optional-fix": { Icon: Circle, iconClass: "text-ink-3", labelClass: "text-ink-2" },
} as const;

export function AiFeedbackBadge({ resubmit }: { resubmit: boolean }) {
  const Icon = resubmit ? RefreshCw : Check;
  return (
    <Badge
      variant={resubmit ? "warning" : "success"}
      className={`ml-auto shrink-0 px-3 py-1 text-sm text-foreground ${resubmit ? "dark:text-warning" : "dark:text-success"}`}
    >
      <Icon size={14} aria-hidden="true" className={resubmit ? "text-warning" : "text-success"} />
      {resubmit ? "直して再提出" : "合格"}
    </Badge>
  );
}

function CodeExample({ label, code }: { label: "NG" | "OK"; code: string }) {
  const ng = label === "NG";
  const Icon = ng ? X : Check;
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border bg-sunken ${ng ? "border-danger/60" : "border-success/60"}`}
    >
      <div
        className={`flex items-center gap-2 border-b border-border px-3 py-2 font-bold ${ng ? "bg-danger-soft dark:text-danger" : "bg-success-soft dark:text-success"}`}
      >
        <Icon size={16} aria-hidden="true" className={ng ? "text-danger" : "text-success"} />
        {label}
      </div>
      <pre className="overflow-x-auto whitespace-pre px-3 py-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function AiFeedbackResult({ view, taskId }: { view: AiFeedbackView; taskId?: string }) {
  const WritingIcon = view.resubmit ? AlertCircle : Check;
  return (
    <>
      <Card className={cardStyle}>
        <p className="text-xl font-semibold">{view.conclusion}</p>
        <dl className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className={insetStyle}>
            <dt className="text-sm text-ink-2">動き</dt>
            <dd className="mt-1 flex items-start gap-2 text-sm font-semibold dark:text-success">
              <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              テストはすべて通過
            </dd>
          </div>
          <div className={insetStyle}>
            <dt className="text-sm text-ink-2">書き方</dt>
            <dd
              className={`mt-1 flex items-start gap-2 text-sm font-semibold ${view.resubmit ? "dark:text-warning" : "dark:text-success"}`}
            >
              <WritingIcon
                size={16}
                className={`mt-0.5 shrink-0 ${view.resubmit ? "text-warning" : "text-success"}`}
                aria-hidden="true"
              />
              {view.writingSummary}
            </dd>
          </div>
        </dl>
        {view.checklist.length > 0 && (
          <ul>
            {view.checklist.map(({ id, label, status, statusLabel }) => {
              const { Icon, iconClass, labelClass } = checklistStyle[status];
              return (
                <li
                  key={id}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1 border-t border-border py-2.5 text-sm last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${status === "required-fix" ? "font-semibold" : ""}`}
                >
                  <Icon size={16} className={`mt-0.5 ${iconClass}`} aria-hidden="true" />
                  <span>{label}</span>
                  <span
                    className={`col-start-2 text-xs sm:col-start-auto sm:self-center ${labelClass}`}
                  >
                    {statusLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {view.fixes.map(({ id, title, problem, why, example }) => (
        <Card key={id} className={`${cardStyle} border-warning/60`}>
          <div>
            <p className="text-sm font-semibold dark:text-warning">直すところ · 合格に必要です</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          </div>
          <div className={`${insetStyle} space-y-1 text-sm leading-relaxed`}>
            {why !== undefined ? (
              <>
                <p className="font-semibold text-ink-2">今の提出の問題</p>
                <p className="whitespace-pre-wrap font-semibold">{problem}</p>
                <p className="whitespace-pre-wrap text-ink-2">{why}</p>
              </>
            ) : (
              <p>{problem}</p>
            )}
          </div>
          {example && (
            <figure className="space-y-2">
              <figcaption className="text-sm text-ink-2">
                例：{example.context}（この課題とは別の題材です）
              </figcaption>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3 sm:gap-4">
                <CodeExample label="NG" code={example.ng} />
                <CodeExample label="OK" code={example.ok} />
              </div>
            </figure>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {taskId && <OpenInVscodeButton taskId={taskId} label="VS Code で開いて直す" />}
            <p className="min-w-0 flex-[1_1_18rem] text-sm leading-relaxed text-ink-2">
              直したら「課題を確認する」→「提出する」。AI がもう一度確認します。 ヒントは VS Code
              の課題パネルから開けます。
            </p>
          </div>
        </Card>
      ))}

      {(view.optionalItems.length > 0 || view.optionalComments.length > 0) && (
        <Card className={cardStyle}>
          <h2 className="text-base font-semibold">
            あわせて直すと良いところ{" "}
            <span className="text-sm text-ink-2">· 合否には関係しません</span>
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
            {view.optionalItems.map(({ id, label }) => (
              <li key={`rubric:${id}`}>{label}</li>
            ))}
            {view.optionalComments.map((comment) => (
              <li key={`finding:${comment}`} className="whitespace-pre-wrap">
                {comment}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {view.message && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{view.message}</p>
      )}
      {view.goodPoints.length > 0 && (
        <Card className={cardStyle}>
          <h2 className="text-base font-semibold">できていること</h2>
          <ul className="space-y-2 text-sm leading-relaxed">
            {view.goodPoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <span className="min-w-0 whitespace-pre-wrap">{point}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
