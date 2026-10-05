import { parsePublicTaskBundle, type TaskBundle } from "@stella/shared/tasks/catalog";
import { normalizeForHash } from "@stella/shared/tasks/hash";
import { canSubmit, type RunResult } from "@stella/shared/tasks/run-result";
import {
  isRunResult,
  isSupportLog,
  type DebuggingRecord,
  type SupportEvent,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import { apiRequest } from "./api.js";
import {
  hashFiles,
  LIMITS,
  listFiles,
  matchPatterns,
  readFileInRoot,
  sha256Hex,
} from "./runner/files.js";
import { loadTask } from "./runner/run-task.js";

export interface SubmissionNotes {
  explanation: string;
  debuggingRecord?: DebuggingRecord;
  support: SupportEvent[];
}
async function optionalJson(root: string, file: string): Promise<unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(await readFileInRoot(root, file, 1024 * 1024)));
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") return undefined;
    throw e;
  }
}
export async function readSubmissionNotes(root: string): Promise<SubmissionNotes | undefined> {
  const raw = await optionalJson(root, ".stella/submission-notes.json");
  if (!raw) return undefined;
  if (
    typeof raw !== "object" ||
    !("explanation" in raw) ||
    typeof raw.explanation !== "string" ||
    !("support" in raw) ||
    !isSupportLog(raw.support)
  )
    throw new Error("提出の記録を読み出せません");
  return raw as SubmissionNotes;
}
export async function readRecordedSupport(root: string): Promise<SupportEvent[]> {
  const raw = await optionalJson(root, ".stella/support.json");
  if (raw === undefined) return [];
  if (!isSupportLog(raw)) throw new Error("支援の記録を読み出せません");
  return raw;
}
/** #31 の配布処理と同じ sidecar を読み、実行時にも版を控える。 */
export async function readDistribution(
  root: string,
): Promise<{ taskId: string; contentHash: string } | undefined> {
  const context = await optionalJson(root, ".stella/distribution.json");
  if (context === undefined) return undefined;
  if (
    !context ||
    typeof context !== "object" ||
    !("taskId" in context) ||
    !("contentHash" in context) ||
    typeof context.taskId !== "string" ||
    typeof context.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(context.contentHash)
  )
    throw new Error("配布した課題の記録が不正です。課題を開き直してください");
  return { taskId: context.taskId, contentHash: context.contentHash };
}
export async function prepareTaskSubmission(
  root: string,
  mode: "submit" | "consult",
  notes: SubmissionNotes,
  bundle: TaskBundle,
): Promise<TaskSubmissionInput> {
  const loaded = await loadTask(root);
  if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
  const raw = JSON.parse(
    new TextDecoder().decode(await readFileInRoot(root, ".stella/last-run.json", 1024 * 1024)),
  );
  if (!isRunResult(raw) || raw.taskId !== loaded.manifest.id)
    throw new Error("この課題の実行結果がありません。先に課題を確認してください");
  if (bundle.manifest.id !== loaded.manifest.id) throw new Error("課題の配布データが一致しません");
  const result: RunResult = raw;
  if (mode === "submit" && !canSubmit(result))
    throw new Error("手元の確認がすべて通ってから提出してください");
  if (mode === "consult" && canSubmit(result))
    throw new Error("手元の確認が通っています。「提出」を使ってください");
  const listed = await listFiles(root);
  const paths = matchPatterns(listed, loaded.manifest.submit.files).files;
  const files: TaskSubmissionInput["files"] = [];
  let total = 0;
  for (const file of paths) {
    const bytes = await readFileInRoot(root, file, LIMITS.fileBytes);
    total += bytes.length;
    if (files.length >= LIMITS.submitFiles || total > LIMITS.totalBytes)
      throw new Error("提出ファイルが容量の上限を超えています");
    files.push({ path: file, content: Buffer.from(bytes).toString("base64") });
  }
  const protectedHashes = await hashFiles(
    root,
    matchPatterns(listed, loaded.manifest.protected).files,
    LIMITS.protectedFileBytes,
  );
  if (
    mode === "submit" &&
    (loaded.manifestSha256 !== result.manifestSha256 ||
      paths.length !== result.files.length ||
      files.some(
        (f) =>
          result.files.find((r) => r.path === f.path)?.sha256 !==
          sha256Hex(normalizeForHash(Buffer.from(f.content, "base64"))),
      ) ||
      protectedHashes.length !== result.protected.length ||
      protectedHashes.some(
        (f) => !result.protected.some((r) => r.path === f.path && r.sha256 === f.sha256),
      ))
  )
    throw new Error("確認後にファイルが変わっています。保存してもう一度確認してください");
  const receipt = await readDistribution(root);
  if (!receipt)
    throw new Error("配布した課題の記録がありません。LMS から配布した課題を開いてください");
  if (
    receipt.taskId !== loaded.manifest.id ||
    (result.taskContentHash && result.taskContentHash !== receipt.contentHash)
  )
    throw new Error("確認した課題の版が変わっています。もう一度確認してください");
  return {
    taskId: loaded.manifest.id,
    contentHash: result.taskContentHash ?? receipt.contentHash,
    mode,
    files,
    localResult: result,
    protected: protectedHashes,
    ...notes,
  };
}
export async function sendTaskSubmission(
  root: string,
  mode: "submit" | "consult",
  notes: SubmissionNotes,
): Promise<{ id: string; attempt: number }> {
  const loaded = await loadTask(root);
  if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
  const response = await apiRequest<{ bundle: unknown }>(
    `/api/tasks/bundle?taskId=${encodeURIComponent(loaded.manifest.id)}`,
  );
  const bundle = parsePublicTaskBundle(response.bundle);
  const body = await prepareTaskSubmission(root, mode, notes, bundle);
  const result = await apiRequest<{ row: { id: string; attempt: number } }>("/api/submissions", {
    method: "POST",
    body,
  });
  return result.row;
}
