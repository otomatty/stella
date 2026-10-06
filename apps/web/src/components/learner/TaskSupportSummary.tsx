import {
  EVIDENCE_LEVEL_LABELS,
  SUPPORT_RECORD_LABELS,
  type SupportRecordKind,
  type TaskSupportRecord,
} from "@stella/shared/tasks/support-record";

const label = (kind: string) => SUPPORT_RECORD_LABELS[kind as SupportRecordKind] ?? kind;

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

function localRunText(runs: NonNullable<TaskSupportRecord["localRuns"]>): string {
  const last =
    runs.failureStreak > 0
      ? `${runs.failureStreak}回続けて失敗`
      : runs.lastOutcome === "passed"
        ? "最後は合格"
        : "最後は環境のエラー";
  const detail = [
    runs.lastOutcome !== "passed" && runs.lastFailedSteps.length
      ? `止まった手順: ${runs.lastFailedSteps.join("・")}`
      : "",
    runs.lastTests
      ? `テスト ${runs.lastTests.passed}/${runs.lastTests.passed + runs.lastTests.failed}`
      : "",
  ].filter(Boolean);
  return `${last}${detail.length ? `、${detail.join("、")}` : ""} (合格 ${runs.passed}・失敗 ${runs.failed}・環境のエラー ${runs.error})`;
}

/**
 * 課題ごとの支援の記録と習得の水準 (#38・03 §7)。受講者本人と講師で同じ表示にする。
 * 人のレビューも記録に出すが、水準を「支援付き」にはしない。
 */
export function TaskSupportSummary({ record }: { record: TaskSupportRecord }) {
  const counts = Object.entries(record.counts);
  return (
    <div className="mt-2 text-xs text-ink-3 space-y-1">
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        {record.assessesSkills ? (
          <span>習得: {EVIDENCE_LEVEL_LABELS[record.level ?? "unconfirmed"]}</span>
        ) : null}
        <span>
          支援の記録:{" "}
          {counts.length ? counts.map(([kind, n]) => `${label(kind)} ${n}`).join("・") : "なし"}
        </span>
        {record.localRuns ? <span>手元の確認: {localRunText(record.localRuns)}</span> : null}
      </p>
      {record.events.length ? (
        <details>
          <summary className="cursor-pointer">記録を見る</summary>
          <ul className="mt-1 space-y-0.5">
            {record.events.map((e) => (
              <li key={`${e.source}-${e.kind}-${e.at}`}>
                {formatAt(e.at)} {label(e.kind)}
                {e.detail ? ` · ${e.detail}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
