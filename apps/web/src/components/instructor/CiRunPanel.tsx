import {
  CI_CHECK_STATUS_LABELS,
  CI_PROBLEM_LABELS,
  type CiRunCheck,
  type CiRunClaim,
  safeHttpsHref,
} from "@stella/shared/tasks/ci-run";
import { AlertTriangle, Check } from "@/lib/icons";

interface CiRunPanelProps {
  /** API が GitHub で確かめた結果 (`machine_check.ci`)。 */
  check: CiRunCheck | null | undefined;
  /** 拡張が控えた申告 (`local_result.ci`)。照合の記録が無いときに使う。 */
  claim: CiRunClaim | null | undefined;
}

/** 外へのリンク。https の URL だけをリンクにし、新しいタブで参照元を渡さずに開く。 */
const ExternalLink = ({ url }: { url: unknown }) => {
  const href = safeHttpsHref(url);
  const text = typeof url === "string" ? url : "(記録なし)";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline break-all">
      {text}
    </a>
  ) : (
    <span className="break-all">{text}</span>
  );
};

function formatTime(value: string | null | undefined): string {
  const ms = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toLocaleString("ja-JP") : "";
}

/**
 * CI と公開 (`ci-deploy`) の課題の、GitHub Actions の実行と公開先 (07 §5.5)。
 * 実行と公開先へのリンク、GitHub の公開 API で確かめた結果と理由を出す。照合できなかった・
 * 食い違ったときは、講師がリンクを開いて確かめる。
 */
export const CiRunPanel = ({ check, claim }: CiRunPanelProps) => {
  const shown = check?.claim ?? claim;
  if (!shown) return null;
  const run = check?.run ?? null;
  const verified = check?.status === "verified";
  return (
    <section className="mt-3 rounded border border-border p-3 text-sm">
      <h3 className="font-semibold mb-1">CI の実行と公開先</h3>
      <ul className="list-disc pl-5">
        <li>
          実行: <ExternalLink url={shown.runUrl} />
        </li>
        <li>
          公開先: <ExternalLink url={shown.deployUrl} />
        </li>
        <li>
          手元のコミット: <code>{shown.commit ?? "(記録なし)"}</code>
        </li>
      </ul>
      {check ? (
        <div className="mt-2">
          <p className={`flex items-center gap-1 ${verified ? "text-success" : "text-warning"}`}>
            {verified ? <Check size={13} /> : <AlertTriangle size={13} />}
            GitHub の照合: {CI_CHECK_STATUS_LABELS[check.status] ?? "照合できませんでした"}
            <span className="text-ink-3 ml-1">{formatTime(check.checkedAt)}</span>
          </p>
          {Array.isArray(check.problems) && check.problems.length > 0 ? (
            <ul className="list-disc pl-5 text-warning">
              {check.problems.map((problem) => (
                <li key={problem}>{CI_PROBLEM_LABELS[problem] ?? problem}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-ink-3 mt-1">
            課題のワークフロー: <code>{check.workflow ?? "(指定なし)"}</code>
          </p>
          {run ? (
            <p className="text-ink-3">
              実行: <code>{run.workflowPath}</code> ・ {run.status ?? "?"} / {run.conclusion ?? "?"}{" "}
              ・ コミット <code>{run.headSha?.slice(0, 7) ?? "?"}</code>
              {run.headBranch ? (
                <>
                  {" "}
                  ・ ブランチ <code>{run.headBranch}</code>
                </>
              ) : null}
              {run.event ? ` ・ ${run.event}` : null}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-warning mt-2 flex items-center gap-1">
          <AlertTriangle size={13} />
          GitHub の照合の記録がありません。リンクを開いて確かめてください。
        </p>
      )}
    </section>
  );
};
