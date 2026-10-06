/**
 * CI と公開 (`ci-deploy`) の課題の提出で、受講者が申告した GitHub Actions の実行を確かめる
 * (docs/curriculum/07 §5.5)。
 *
 * - 通信先は GitHub の REST API だけ。受講者の入力をそのまま fetch せず、実行の URL から
 *   正規表現で取り出した owner・repo・番号で `https://api.github.com/repos/{owner}/{repo}/actions/runs/{id}`
 *   を組み立てる。公開先の URL はサーバーから取りに行かない (SSRF を作らない)。
 * - 確かめること: 実行が成功で終わった (`status=completed` かつ `conclusion=success`)、実行の
 *   コミット (`head_sha`) が拡張の控えたコミットと同じ、ワークフローのファイル (`path`) が課題の
 *   指定と同じ、リポジトリ (`repository.full_name`) が URL の owner/repo と同じ、公開のリポジトリ。
 * - 照合できないとき (見つからない・非公開・回数制限・時間切れ・GitHub の不調・形の悪い応答) と
 *   食い違いは、例外にせず結果に理由を残す。提出は人に回る (07 §6.3)。
 * - トークン (`GITHUB_API_TOKEN`) は任意。あれば付けて回数の上限を上げる (未認証は IP ごとに
 *   1 時間 60 回で、Workers の送信元は共有なので当たりやすい)。トークンはログにも結果にも残さない。
 *   転送 (redirect) はたどらない (トークンを別の場所へ送らず、名前の変わったリポジトリを照合したことにしない)。
 */

import {
  type CiProblem,
  type CiRunCheck,
  type CiRunClaim,
  type CiRunSummary,
  COMMIT_SHA,
  ciCheckStatusOf,
  GITHUB_API_ORIGIN,
  githubRunApiPath,
  parseGithubRunUrl,
} from "@stella/shared/tasks/ci-run";

/** 提出の応答を待たせる上限。GitHub の API は通常 1 秒もかからない。 */
export const GITHUB_API_TIMEOUT_MS = 5_000;
/** 応答の本文の上限。実行の JSON は数十 KB に収まる。 */
const MAX_BODY_CHARS = 512 * 1024;
const USER_AGENT = "stella-lms-ci-check";

export interface CiRunCheckOptions {
  /** 差し替え用 (テスト)。既定は Workers の fetch。 */
  fetch?: typeof fetch;
  /** GitHub の API のトークン (任意)。 */
  token?: string;
  timeoutMs?: number;
  now?: () => Date;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** GitHub の決まった語 (`completed`・`success`・`push` など) だけを残す。 */
function word(v: unknown): string | null {
  return typeof v === "string" && /^[a-z_]{1,40}$/.test(v) ? v : null;
}

/** 外から来た文字列を、表示に使える長さと文字に限って残す。 */
function short(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const cleaned = [...v].filter((c) => c.charCodeAt(0) >= 0x20 && c !== "\u007f").join("");
  return cleaned.slice(0, max);
}

function isoTime(v: unknown): string | null {
  return typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v)) ? v : null;
}

/** 実行の JSON の、照合に要る項目。形が違えば null。 */
function readRun(json: unknown): {
  id: number;
  status: string | null;
  conclusion: string | null;
  headSha: string;
  path: string;
  fullName: string;
  isPrivate: boolean;
  raw: Record<string, unknown>;
} | null {
  if (!isObject(json) || !isObject(json.repository)) return null;
  const { id, head_sha: headSha, path, repository } = json;
  if (
    typeof id !== "number" ||
    !Number.isSafeInteger(id) ||
    typeof headSha !== "string" ||
    typeof path !== "string" ||
    path.length > 500 ||
    typeof repository.full_name !== "string" ||
    !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(repository.full_name) ||
    typeof repository.private !== "boolean" ||
    (json.status !== null && typeof json.status !== "string") ||
    (json.conclusion !== null &&
      json.conclusion !== undefined &&
      typeof json.conclusion !== "string")
  )
    return null;
  return {
    id,
    status: word(json.status),
    conclusion: word(json.conclusion),
    headSha: headSha.toLowerCase(),
    // `.github/workflows/deploy.yml@refs/heads/main` のように参照が付くことがある。
    path: path.replace(/@.*$/, ""),
    fullName: repository.full_name,
    isPrivate: repository.private,
    raw: json,
  };
}

function summaryOf(run: NonNullable<ReturnType<typeof readRun>>): CiRunSummary {
  const attempt = run.raw.run_attempt;
  return {
    id: run.id,
    repository: run.fullName,
    workflowPath: short(run.path, 300) ?? "",
    event: word(run.raw.event),
    status: run.status,
    conclusion: run.conclusion,
    headSha: COMMIT_SHA.test(run.headSha) ? run.headSha : null,
    headBranch: short(run.raw.head_branch, 255),
    runAttempt: typeof attempt === "number" && Number.isSafeInteger(attempt) ? attempt : null,
    updatedAt: isoTime(run.raw.updated_at),
  };
}

/** 403・429 のうち、回数制限によるものか (GitHub は残りの回数・待ち時間をヘッダで返す)。 */
function isRateLimited(response: Response): boolean {
  return (
    response.status === 429 ||
    response.headers.get("x-ratelimit-remaining") === "0" ||
    response.headers.has("retry-after")
  );
}

/**
 * 申告した実行を GitHub の公開 API で確かめる。通信や応答の失敗も含めて例外にはせず、
 * 結果 (`status`・`problems`) に残す。
 */
export async function checkCiRun(
  input: { claim: CiRunClaim; workflow: string | undefined },
  options: CiRunCheckOptions = {},
): Promise<CiRunCheck> {
  const now = options.now ?? (() => new Date());
  const token = options.token?.trim() || undefined;
  const result = (
    problems: CiProblem[],
    extra: { run?: CiRunSummary | null; httpStatus?: number | null } = {},
  ): CiRunCheck => ({
    status: ciCheckStatusOf(problems),
    problems,
    checkedAt: now().toISOString(),
    workflow: input.workflow ?? null,
    claim: input.claim,
    run: extra.run ?? null,
    httpStatus: extra.httpStatus ?? null,
    authenticated: token !== undefined,
  });

  if (!input.workflow) return result(["no-workflow"]);
  if (!input.claim.commit || !COMMIT_SHA.test(input.claim.commit)) return result(["no-commit"]);
  const ref = parseGithubRunUrl(input.claim.runUrl);
  if (!ref) return result(["invalid-url"]);
  const url = new URL(githubRunApiPath(ref), GITHUB_API_ORIGIN);
  // 組み立てた URL が GitHub の API の、この実行の場所だけを指すこと (念のため)。
  if (
    url.origin !== GITHUB_API_ORIGIN ||
    url.pathname !== `/repos/${ref.owner}/${ref.repo}/actions/runs/${ref.runId}` ||
    url.search !== ""
  )
    return result(["invalid-url"]);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const doFetch = options.fetch ?? fetch;
  let response: Response;
  try {
    response = await doFetch(url.toString(), {
      method: "GET",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs ?? GITHUB_API_TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return result([timedOut ? "timeout" : "network"]);
  }
  const httpStatus = response.status;
  if (httpStatus !== 200) {
    // 本文は読まずに閉じる (接続を残さない)。
    await response.body?.cancel().catch(() => undefined);
    // 名前・持ち主が変わったリポジトリは、GitHub が新しい場所への転送を返す。たどらない。
    if (httpStatus >= 300 && httpStatus < 400) return result(["moved"], { httpStatus });
    if (httpStatus === 404 || httpStatus === 410) return result(["not-found"], { httpStatus });
    if (httpStatus === 401) {
      // 設定したトークンが無効。値は出さない。
      console.warn("[ci-run-check] GitHub API rejected the configured token (401)");
      return result(["forbidden"], { httpStatus });
    }
    if (httpStatus === 403 || httpStatus === 429)
      return result([isRateLimited(response) ? "rate-limited" : "forbidden"], { httpStatus });
    if (httpStatus >= 500) return result(["server-error"], { httpStatus });
    return result(["unexpected-response"], { httpStatus });
  }
  let body: string;
  try {
    if (Number(response.headers.get("content-length") ?? "0") > MAX_BODY_CHARS) {
      await response.body?.cancel().catch(() => undefined);
      return result(["unexpected-response"], { httpStatus });
    }
    body = await response.text();
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return result([timedOut ? "timeout" : "unexpected-response"], { httpStatus });
  }
  if (body.length > MAX_BODY_CHARS) return result(["unexpected-response"], { httpStatus });

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return result(["unexpected-response"], { httpStatus });
  }
  const run = readRun(json);
  if (!run || String(run.id) !== ref.runId) return result(["unexpected-response"], { httpStatus });
  // 非公開のリポジトリは照合しない (トークンが読めても、要約を残さない)。課題は公開のリポジトリで行う。
  if (run.isPrivate) return result(["private-repository"], { httpStatus });

  const problems: CiProblem[] = [];
  if (run.status !== "completed") problems.push("not-completed");
  else if (run.conclusion !== "success") problems.push("not-success");
  if (run.headSha !== input.claim.commit.toLowerCase()) problems.push("commit-mismatch");
  if (run.path !== input.workflow) problems.push("workflow-mismatch");
  // GitHub の owner・repo は大文字小文字を区別しない。
  if (run.fullName.toLowerCase() !== `${ref.owner}/${ref.repo}`.toLowerCase())
    problems.push("repository-mismatch");
  return result(problems, { run: summaryOf(run), httpStatus });
}
