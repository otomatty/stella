import picomatch from "picomatch";
import type { TaskBundle } from "./catalog.js";
import { normalizeForHash } from "./hash.js";
import { isSafeRelativePattern } from "./manifest.js";
import { canSubmit, decideOutcome, type HashedFile, type RunResult } from "./run-result.js";
import { RUNNERS } from "./runners.js";

export const SUBMISSION_LIMITS = {
  files: 50,
  fileBytes: 1024 * 1024,
  totalBytes: 5 * 1024 * 1024,
  metadataBytes: 1024 * 1024,
};
export const SUPPORT_KINDS = [
  "hint",
  "solution",
  "fixed-start",
  "instructor",
  "ai-answer",
] as const;
export const SUPPORT_LABELS: Record<(typeof SUPPORT_KINDS)[number], string> = {
  hint: "解法のヒント",
  solution: "解答の表示",
  "fixed-start": "固定した開始点",
  instructor: "講師からの実装支援",
  "ai-answer": "AI による解答生成",
};
export interface SupportEvent {
  kind: (typeof SUPPORT_KINDS)[number];
  at: string;
  detail?: string;
}
export interface DebuggingRecord {
  reproduction: string;
  expected: string;
  cause: string;
  fix: string;
  regression: string;
}
export interface TaskSubmissionInput {
  taskId: string;
  contentHash: string;
  mode: "submit" | "consult";
  files: { path: string; content: string }[];
  localResult: RunResult;
  protected: HashedFile[];
  explanation: string;
  debuggingRecord?: DebuggingRecord;
  support: SupportEvent[];
}
export interface MachineCheck {
  matched: boolean;
  reasons: string[];
}
export const HASH_RE = /^[a-f0-9]{64}$/;
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function isSubmissionPath(v: unknown): v is string {
  return (
    typeof v === "string" &&
    isSafeRelativePattern(v) &&
    !/[*?{}[\]]/.test(v) &&
    !v.split("/").some((s) => [".", ".stella", ".git", "node_modules", "private"].includes(s))
  );
}
function hashedFiles(v: unknown): v is HashedFile[] {
  return (
    Array.isArray(v) &&
    v.length <= 5000 &&
    new Set(v.map((f) => (object(f) ? f.path : null))).size === v.length &&
    v.every(
      (f) =>
        object(f) &&
        isSubmissionPath(f.path) &&
        typeof f.sha256 === "string" &&
        HASH_RE.test(f.sha256) &&
        Number.isSafeInteger(f.bytes) &&
        Number(f.bytes) >= 0,
    )
  );
}
export function isRunResult(v: unknown): v is RunResult {
  return (
    object(v) &&
    v.schemaVersion === 1 &&
    typeof v.taskId === "string" &&
    typeof v.runner === "string" &&
    ["passed", "failed", "error", "cancelled"].includes(String(v.outcome)) &&
    typeof v.startedAt === "string" &&
    Number.isFinite(Date.parse(v.startedAt)) &&
    typeof v.durationMs === "number" &&
    Number.isFinite(v.durationMs) &&
    v.durationMs >= 0 &&
    typeof v.platform === "string" &&
    object(v.toolVersions) &&
    typeof v.manifestSha256 === "string" &&
    HASH_RE.test(v.manifestSha256) &&
    (v.taskContentHash === undefined ||
      (typeof v.taskContentHash === "string" && HASH_RE.test(v.taskContentHash))) &&
    hashedFiles(v.files) &&
    hashedFiles(v.protected) &&
    Array.isArray(v.steps) &&
    v.steps.length <= 20 &&
    v.steps.every(
      (s) =>
        object(s) &&
        typeof s.id === "string" &&
        typeof s.label === "string" &&
        typeof s.summary === "string" &&
        ["passed", "failed", "error", "skipped"].includes(String(s.status)) &&
        typeof s.durationMs === "number" &&
        Number.isFinite(s.durationMs) &&
        s.durationMs >= 0 &&
        (s.tests === undefined ||
          (Array.isArray(s.tests) &&
            s.tests.every(
              (t) =>
                object(t) &&
                typeof t.name === "string" &&
                ["passed", "failed", "skipped"].includes(String(t.status)),
            ))),
    )
  );
}
export function isSupportLog(v: unknown): v is SupportEvent[] {
  return (
    Array.isArray(v) &&
    v.length <= 200 &&
    v.every(
      (e) =>
        object(e) &&
        SUPPORT_KINDS.includes(e.kind as SupportEvent["kind"]) &&
        typeof e.at === "string" &&
        Number.isFinite(Date.parse(e.at)) &&
        (e.detail === undefined || (typeof e.detail === "string" && e.detail.length <= 2000)),
    )
  );
}
export function parseTaskSubmission(v: unknown): TaskSubmissionInput {
  if (
    !object(v) ||
    typeof v.taskId !== "string" ||
    v.taskId.length > 300 ||
    typeof v.contentHash !== "string" ||
    !HASH_RE.test(v.contentHash) ||
    !["submit", "consult"].includes(String(v.mode)) ||
    !isRunResult(v.localResult) ||
    !hashedFiles(v.protected) ||
    !isSupportLog(v.support) ||
    typeof v.explanation !== "string" ||
    v.explanation.length > 20000 ||
    !Array.isArray(v.files) ||
    v.files.length > SUBMISSION_LIMITS.files ||
    v.files.some((f) => !object(f) || !isSubmissionPath(f.path) || typeof f.content !== "string") ||
    new Set(v.files.map((f) => f.path)).size !== v.files.length
  )
    throw new Error("提出データの形式が不正です");
  if (
    v.debuggingRecord !== undefined &&
    (!object(v.debuggingRecord) ||
      ["reproduction", "expected", "cause", "fix", "regression"].some(
        (key) =>
          typeof (v.debuggingRecord as Record<string, unknown>)[key] !== "string" ||
          String((v.debuggingRecord as Record<string, unknown>)[key]).length > 10000,
      ))
  )
    throw new Error("修正記録の形式が不正です");
  if (JSON.stringify({ ...v, files: [] }).length > SUBMISSION_LIMITS.metadataBytes)
    throw new Error("提出の記録が大きすぎます");
  return v as unknown as TaskSubmissionInput;
}
export function decodeFile(content: string): Uint8Array {
  if (
    content.length > Math.ceil(SUBMISSION_LIMITS.fileBytes / 3) * 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)
  )
    throw new Error("提出ファイルの内容が不正か、1MB を超えています");
  return Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
}
export async function contentHash(bytes: Uint8Array): Promise<string> {
  const normalized = normalizeForHash(bytes);
  const hash = await crypto.subtle.digest("SHA-256", Uint8Array.from(normalized));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function matchesPattern(file: string, patterns: string[]): boolean {
  return patterns.some((p) => picomatch(p, { dot: true })(file));
}
function sameHashes(a: HashedFile[], b: HashedFile[]): boolean {
  return (
    a.length === b.length &&
    a.every((f) => b.some((g) => g.path === f.path && g.sha256 === f.sha256))
  );
}
export async function verifyTaskSubmission(
  input: TaskSubmissionInput,
  bundle: TaskBundle,
): Promise<{ check: MachineCheck; files: (HashedFile & { data: Uint8Array })[] }> {
  const manifest = bundle.manifest;
  const files: (HashedFile & { data: Uint8Array })[] = [];
  let total = 0;
  for (const f of input.files) {
    if (!matchesPattern(f.path, manifest.submit.files))
      throw new Error(`提出対象ではないファイルです: ${f.path}`);
    const data = decodeFile(f.content);
    total += data.length;
    if (data.length > SUBMISSION_LIMITS.fileBytes || total > SUBMISSION_LIMITS.totalBytes)
      throw new Error("提出ファイルが容量の上限を超えています");
    files.push({ path: f.path, bytes: data.length, sha256: await contentHash(data), data });
  }
  const reasons: string[] = [];
  if (input.mode === "consult") reasons.push("受講者が講師への相談を求めています");
  if (
    manifest.id !== input.taskId ||
    input.contentHash !== bundle.contentHash ||
    input.localResult.taskId !== input.taskId ||
    input.localResult.runner !== manifest.runner ||
    (input.localResult.taskContentHash !== undefined &&
      input.localResult.taskContentHash !== input.contentHash)
  )
    reasons.push("課題と実行結果が一致しません");
  if (!canSubmit(input.localResult) || decideOutcome(input.localResult.steps) !== "passed")
    reasons.push("手元の確認がすべて通っていません");
  if (
    !sameHashes(files, input.localResult.files) ||
    files.some((f) => input.localResult.files.find((g) => g.path === f.path)?.bytes !== f.bytes)
  )
    reasons.push("実行したファイルと提出ファイルが一致しません");
  if (manifest.submit.files.some((p) => !files.some((f) => matchesPattern(f.path, [p]))))
    reasons.push("提出するファイルが不足しています");
  const expectedProtected: HashedFile[] = [];
  for (const [path, encoded] of Object.entries(bundle.files)) {
    if (matchesPattern(path, manifest.protected)) {
      const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      expectedProtected.push({ path, sha256: await contentHash(data), bytes: data.length });
    }
  }
  if (
    !sameHashes(expectedProtected, input.protected) ||
    !sameHashes(expectedProtected, input.localResult.protected) ||
    manifest.protected.some((p) => !expectedProtected.some((f) => matchesPattern(f.path, [p])))
  )
    reasons.push("配布したテスト・設定のハッシュが一致しません");
  const manifestBytes = Uint8Array.from(atob(bundle.files[".stella/task.json"] ?? ""), (c) =>
    c.charCodeAt(0),
  );
  if (input.localResult.manifestSha256 !== (await contentHash(manifestBytes)))
    reasons.push("実行した課題設定が配布した設定と一致しません");
  const plan = RUNNERS[manifest.runner].plan;
  const required =
    plan === "static"
      ? ["static"]
      : plan === "diagnose"
        ? ["diagnose"]
        : plan === "ci"
          ? ["test"]
          : [
              "deps",
              ...(manifest.checks.lint ? ["lint"] : []),
              ...(manifest.checks.format ? ["format"] : []),
              ...(plan === "vitest"
                ? ["test"]
                : ["browsers", "e2e", ...(plan === "next" ? ["build"] : [])]),
            ];
  if (
    required.some(
      (id) => !input.localResult.steps.some((s) => s.id === id && s.status === "passed"),
    ) ||
    input.localResult.steps.some((s) => s.tests?.some((t) => t.status !== "passed"))
  )
    reasons.push("必要な確認の結果が不足しています");
  return { check: { matched: reasons.length === 0, reasons }, files };
}
