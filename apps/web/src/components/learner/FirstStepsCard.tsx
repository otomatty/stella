import type { FirstSteps, FirstStepKey } from "@stella/shared/study/first-steps";
import { CheckCircle, Circle } from "@/lib/icons";

const labels: Record<FirstStepKey, string> = {
  "read-first-lesson": "最初のレッスンを読む",
  "connected-vscode": "VS Code とつなぐ (U01 の手順)",
  "checked-first-task": "最初の課題を「課題を確認する」で確かめる",
  "submitted-first-task": "最初の課題を提出する",
  "got-result": "結果を受け取る",
};
const instructions: Record<FirstStepKey, string> = {
  "read-first-lesson": "レッスンを開いて読み、完了にしてください。",
  "connected-vscode": "U01 の手順で VS Code と STELLA 拡張を準備し、STELLA とつないでください。",
  "checked-first-task": "U02 の最初の課題を VS Code で開き、「課題を確認する」を実行してください。",
  "submitted-first-task": "最初の課題を確認できたら、VS Code から提出してください。",
  "got-result": "提出のレビューが終わるのを待ち、結果を確認してください。",
};
export function FirstStepsCard({
  data,
  compact = false,
}: {
  data: FirstSteps | null;
  compact?: boolean;
}) {
  if (!data) return null;
  const next = data.items.find((item) => !item.done);
  if (!next)
    return <p className="mb-4 text-sm text-success">STELLA の使い方はひととおり済みました</p>;
  return (
    <section
      data-testid="stage-first-steps"
      aria-label="STELLA の使い方"
      className="mb-4 rounded-lg border border-border p-4"
    >
      <h3 className="mb-2 text-sm font-semibold">STELLA の使い方</h3>
      <ul className={compact ? "flex flex-wrap gap-3 text-xs" : "space-y-2 text-sm"}>
        {data.items.map((item) => (
          <li key={item.key} className="flex flex-wrap items-center gap-2">
            {item.done ? (
              <CheckCircle size={15} className="text-success" aria-label="済み" />
            ) : (
              <Circle size={15} aria-label="未" />
            )}
            <span>{labels[item.key]}</span>
            {item.key === next.key ? <span className="text-brand">次はここ</span> : null}
            {!compact && item.key === next.key ? (
              <p className="w-full text-xs text-ink-3">{instructions[item.key]}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
