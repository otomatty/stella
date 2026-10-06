/**
 * `ci-deploy` の課題で、提出に添える GitHub Actions の実行と公開先 (docs/curriculum/07 §5.5)。
 *
 * - 受講者は自分の GitHub のリポジトリに push し、Actions の実行が通ったら、その実行の URL と
 *   公開先の URL を拡張に入力する。拡張は URL の形だけを確かめ、手元のコミット (`git rev-parse HEAD`)
 *   を控える。拡張は GitHub に通信しない。
 * - API は提出を受けたときに、GitHub の公開 API で実行を確かめ、結果 (`CiRunCheck`) を提出の
 *   機械の照合 (`machine_check.ci`) に残す。照合できない・食い違うときは人に回す (07 §6.3)。
 *
 * 受講者の入力をそのまま通信先にしない。実行の URL は厳密な形だけを受け付け、owner・repo・
 * 実行の番号を取り出して、API の URL を組み立て直す (`githubRunApiPath`)。公開先の URL は
 * サーバーから取りに行かない (リンクとして講師に見せるだけ)。
 *
 * web・api・拡張のどこからも読むので、実行時の依存を持たない。
 */

/** `task.json` の `ci.workflow` に書けるパス。GitHub Actions はリポジトリの一番上の `.github/workflows/` だけを読む。 */
export const CI_WORKFLOW_PATH = /^\.github\/workflows\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.ya?ml$/;

export function isCiWorkflowPath(value: unknown): value is string {
  return typeof value === "string" && CI_WORKFLOW_PATH.test(value);
}

/** Git のコミット (GitHub は SHA-1 の 40 桁)。 */
export const COMMIT_SHA = /^[0-9a-f]{40}$/;

/** 実行の URL の上限。GitHub の owner (39 文字)・repo (100 文字)・番号を足しても収まる。 */
const MAX_RUN_URL = 300;
/** 公開先の URL の上限。 */
const MAX_DEPLOY_URL = 500;

/**
 * 実行の URL。`https://github.com/<owner>/<repo>/actions/runs/<番号>` だけを受け付ける。
 * - owner: 英数字とハイフン (先頭は英数字、39 文字まで)
 * - repo: 英数字・`.`・`_`・`-` (100 文字まで。`.` と `..` は除く)
 * - 番号: 先頭が 0 でない 16 桁までの数字
 * 大文字のスキーム・ホスト、`@`・ポート・クエリ・`#`・末尾の `/`・ジョブの画面 (`/job/…`) は受け付けない。
 */
const RUN_URL =
  /^https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})\/actions\/runs\/([1-9][0-9]{0,15})$/;

export interface GithubRunRef {
  owner: string;
  repo: string;
  /** 実行の番号 (10 進の文字列)。 */
  runId: string;
}

/** 実行の URL を厳密に読む。形が違えば null。 */
export function parseGithubRunUrl(value: unknown): GithubRunRef | null {
  if (typeof value !== "string" || value.length > MAX_RUN_URL) return null;
  const match = RUN_URL.exec(value);
  if (!match) return null;
  const [, owner, repo, runId] = match as unknown as [string, string, string, string];
  if (repo === "." || repo === "..") return null;
  if (!Number.isSafeInteger(Number(runId))) return null;
  return { owner, repo, runId };
}

/** 実行の URL の問題 (入力欄に出す文)。問題が無ければ null。 */
export function runUrlProblem(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return "実行の URL を入力してください";
  if (parseGithubRunUrl(value)) return null;
  if (/\/actions\/runs\/\d+\/(job|attempts)\//.test(value))
    return "ジョブの画面ではなく、実行の画面の URL (…/actions/runs/<番号>) を入力してください";
  return "実行の URL は https://github.com/<owner>/<repo>/actions/runs/<番号> の形で入力してください (末尾の / や ? 以降は付けない)";
}

/** GitHub の REST API の場所。受講者の入力からは決めない。 */
export const GITHUB_API_ORIGIN = "https://api.github.com";

/** 実行を取る API のパス (`GET /repos/{owner}/{repo}/actions/runs/{run_id}`)。 */
export function githubRunApiPath(ref: GithubRunRef): string {
  return `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/actions/runs/${ref.runId}`;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * 公開先の URL の問題 (入力欄に出す文)。問題が無ければ null。
 * https の公開のドメインだけを受け付ける。手元 (localhost)・IP アドレス・ポート・利用者名入りは
 * 受け付けない。サーバーはこの URL を取りに行かず、講師の画面のリンクにだけ使う。
 */
export function deployUrlProblem(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return "公開先の URL を入力してください";
  if (value.length > MAX_DEPLOY_URL)
    return `公開先の URL が長すぎます (${MAX_DEPLOY_URL} 文字まで)`;
  if (!value.startsWith("https://")) return "公開先の URL は https:// で始めてください";
  // 空白・制御文字・`\` (ブラウザーが `/` と読み替える) は、見た目と行き先を食い違わせうる。
  if (/[\s\\]/.test(value) || [...value].some((c) => c.charCodeAt(0) < 0x20 || c === "\u007f"))
    return "公開先の URL に空白・制御文字・\\ は使えません";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "公開先の URL の形が正しくありません";
  }
  if (url.protocol !== "https:") return "公開先の URL は https:// で始めてください";
  if (url.username || url.password)
    return "公開先の URL に利用者名やパスワードは入れないでください";
  // `new URL` は既定のポート (`:443`) と空のポート (`:`) を消すので、書かれた形の authority でも見る。
  const authority = value.slice("https://".length).split(/[/?#]/, 1)[0] ?? "";
  if (url.port || /:\d*$/.test(authority.slice(authority.lastIndexOf("@") + 1)))
    return "公開先の URL にポート番号は入れないでください";
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".localhost"))
    return "手元 (localhost) ではなく、公開した URL を入力してください";
  if (IPV4.test(host) || host.startsWith("["))
    return "IP アドレスではなく、ドメイン名の URL を入力してください";
  if (!host.includes(".") || host.endsWith(".")) return "公開先のドメイン名を確認してください";
  return null;
}

/** 講師の画面などでリンクにしてよい URL (https で、利用者名などを含まない)。だめなら null。 */
export function safeHttpsHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (parseGithubRunUrl(value)) return value;
  return deployUrlProblem(value) === null ? new URL(value).href : null;
}

/**
 * 拡張が `.stella/last-run.json` と提出に残す、受講者の申告。
 * `commit` は手元のコミットを読めたときだけ持つ (提出できる結果は必ず持つ)。
 */
export interface CiRunClaim {
  runUrl: string;
  deployUrl: string;
  commit?: string;
}

/** 申告を検証し、知っている項目だけで組み直す。形が違えば null。 */
export function parseCiRunClaim(value: unknown): CiRunClaim | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!parseGithubRunUrl(raw.runUrl) || deployUrlProblem(raw.deployUrl) !== null) return null;
  if (raw.commit !== undefined && (typeof raw.commit !== "string" || !COMMIT_SHA.test(raw.commit)))
    return null;
  return {
    runUrl: raw.runUrl as string,
    deployUrl: raw.deployUrl as string,
    ...(raw.commit === undefined ? {} : { commit: raw.commit as string }),
  };
}

// ---------------------------------------------------------------
// API の照合の結果 (`machine_check.ci`)
// ---------------------------------------------------------------

/**
 * 照合の結果。verified = 確かめられた、mismatch = 確かめた結果が提出と食い違う (受講者の側)、
 * unverifiable = 確かめられなかった (非公開・見つからない・回数制限・GitHub の不調など)。
 * verified 以外は人に回す (07 §6.3)。
 */
export const CI_CHECK_STATUSES = ["verified", "mismatch", "unverifiable"] as const;
export type CiCheckStatus = (typeof CI_CHECK_STATUSES)[number];
export const CI_CHECK_STATUS_LABELS: Record<CiCheckStatus, string> = {
  verified: "照合できました",
  mismatch: "提出と食い違います",
  unverifiable: "照合できませんでした",
};

/** 食い違い (確かめた事実が提出と違う)。 */
const MISMATCH_PROBLEMS = [
  "not-completed",
  "not-success",
  "commit-mismatch",
  "workflow-mismatch",
  "repository-mismatch",
] as const;
/** 照合できない理由。 */
const UNVERIFIABLE_PROBLEMS = [
  "no-commit",
  "no-workflow",
  "invalid-url",
  "not-found",
  "private-repository",
  "moved",
  "rate-limited",
  "forbidden",
  "timeout",
  "network",
  "server-error",
  "unexpected-response",
] as const;
export const CI_PROBLEMS = [...MISMATCH_PROBLEMS, ...UNVERIFIABLE_PROBLEMS] as const;
export type CiProblem = (typeof CI_PROBLEMS)[number];
export const CI_PROBLEM_LABELS: Record<CiProblem, string> = {
  "not-completed": "実行がまだ終わっていません",
  "not-success": "実行が成功で終わっていません",
  "commit-mismatch": "実行したコミットが、手元のコミットと違います",
  "workflow-mismatch": "課題が指定したワークフローの実行ではありません",
  "repository-mismatch": "実行のリポジトリが URL と違います",
  "no-commit": "手元のコミットが記録されていません",
  "no-workflow": "課題にワークフローの指定がありません",
  "invalid-url": "実行の URL の形が正しくありません",
  "not-found": "実行が見つかりません (非公開のリポジトリか、URL の誤り)",
  "private-repository": "非公開のリポジトリです",
  moved: "リポジトリの名前か場所が変わっています",
  "rate-limited": "GitHub の API の回数制限に当たりました",
  forbidden: "GitHub の API が問い合わせを断りました",
  timeout: "GitHub の API が時間内に応答しませんでした",
  network: "GitHub の API に接続できませんでした",
  "server-error": "GitHub の API が不調です",
  "unexpected-response": "GitHub の API の応答を読めませんでした",
};

/** 問題の一覧から結果を決める。食い違いが 1 つでもあれば mismatch (確かめた事実なので先に出す)。 */
export function ciCheckStatusOf(problems: readonly CiProblem[]): CiCheckStatus {
  if (problems.some((p) => (MISMATCH_PROBLEMS as readonly string[]).includes(p))) return "mismatch";
  return problems.length === 0 ? "verified" : "unverifiable";
}

/** GitHub から取った実行の要約。どの項目も形と長さを確かめてから残す。 */
export interface CiRunSummary {
  id: number;
  /** `owner/repo` (GitHub の表記)。 */
  repository: string;
  /** 実行したワークフローのファイル (`@ref` を除いたもの)。 */
  workflowPath: string;
  event: string | null;
  status: string | null;
  conclusion: string | null;
  headSha: string | null;
  headBranch: string | null;
  runAttempt: number | null;
  updatedAt: string | null;
}

/** API が提出と一緒に残す照合の結果。 */
export interface CiRunCheck {
  status: CiCheckStatus;
  problems: CiProblem[];
  /** 照合した時刻 (ISO 8601)。 */
  checkedAt: string;
  /** 課題が指定したワークフロー。 */
  workflow: string | null;
  /** 照合した申告。 */
  claim: CiRunClaim;
  /** 取れた実行の要約。取れなかった・非公開のときは null。 */
  run: CiRunSummary | null;
  /** GitHub の応答の状態コード。応答が無ければ null。 */
  httpStatus: number | null;
  /** トークンを付けて問い合わせたか (トークンそのものは残さない)。 */
  authenticated: boolean;
}

/** DB から読んだ照合の結果の、人に回す理由に使う部分だけを確かめる。 */
export function ciCheckStatusFrom(value: unknown): CiCheckStatus | null {
  if (typeof value !== "object" || value === null) return null;
  const status = (value as { status?: unknown }).status;
  return (CI_CHECK_STATUSES as readonly unknown[]).includes(status)
    ? (status as CiCheckStatus)
    : // 形の壊れた記録は確かめられなかったものとして扱う (確かめたことにしない)。
      "unverifiable";
}
