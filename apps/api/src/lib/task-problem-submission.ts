import { and, eq, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import { verifyTaskSubmission, type TaskSubmissionInput } from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import {
  submissions,
  taskPrivateVersions,
  taskProblemResults,
  taskProgress,
  taskRevisions,
} from "../db/schema.js";
import { ApiError, type Caller } from "./authz.js";
import { loadCodingRuleSet } from "./coding-rule-set.js";
import { withResourceLock } from "./resource-lock.js";
import { withRecordedFixedStart } from "./task-fixed-start.js";
import { withRecordedHelp } from "./task-help.js";
import { reviewTaskSubmission, taskSubmissionLockId } from "./task-submission.js";

/** 問題の提出の応答。課題の提出行とは別。 */
export interface ProblemSubmissionResult {
  problemId: string;
  passedProblems: number;
  totalProblems: number;
  taskPassed: boolean;
}

export function isProblemSubmissionResult<T extends { id: string }>(
  value: ProblemSubmissionResult | T,
): value is ProblemSubmissionResult {
  return !("id" in value);
}

export interface TaskDefinitionView {
  problems: { id: string; title: string }[] | null;
  assesses: string[];
}

/** 版の definition から、今数える問題と評価するスキルを読む。壊れていれば問題なし。 */
export function readTaskDefinition(definition: string): TaskDefinitionView {
  let parsed: unknown;
  try {
    parsed = JSON.parse(definition);
  } catch {
    return { problems: null, assesses: [] };
  }
  if (!parsed || typeof parsed !== "object") return { problems: null, assesses: [] };
  const record = parsed as { problems?: unknown; skills?: { assesses?: unknown } };
  const assesses = Array.isArray(record.skills?.assesses)
    ? record.skills.assesses.filter((id): id is string => typeof id === "string")
    : [];
  if (!Array.isArray(record.problems) || record.problems.length === 0)
    return { problems: null, assesses };
  const problems: { id: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const item of record.problems) {
    if (!item || typeof item !== "object") continue;
    const id = "id" in item && typeof item.id === "string" ? item.id : "";
    const title = "title" in item && typeof item.title === "string" ? item.title.trim() : "";
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    problems.push({ id, title });
  }
  return { problems: problems.length > 0 ? problems : null, assesses };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type ProblemTask = {
  id: string;
  stageTitle: string;
  sectionTitle: string | null;
  contentHash: string;
  stageSlug: string;
  privateFiles: string | null;
};

/**
 * 問題つきの課題の提出。照合に落ちたら何も書かない。AI の待ち行列には積まない。
 * 今の版の問題が全部そろって、まだ合格していなければ、課題の提出を 1 行作って
 * ロックの外で `tests` として確定する (同じロックを取り直す)。
 */
export async function submitTaskProblem(
  db: Db,
  caller: Caller,
  input: TaskSubmissionInput,
  task: ProblemTask,
  bundle: TaskBundle,
): Promise<ProblemSubmissionResult> {
  if (!input.problemId) throw new ApiError("拡張を更新してください", 400);
  const problemId = input.problemId;
  let verified: Awaited<ReturnType<typeof verifyTaskSubmission>>;
  try {
    verified = await verifyTaskSubmission(input, bundle);
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : "提出が不正です", 400);
  }
  if (!verified.check.matched) throw new ApiError(verified.check.reasons.join("\n"), 400);
  const [file] = verified.files;
  if (!file) throw new ApiError("提出するファイルが不足しています", 400);
  const code = new TextDecoder().decode(file.data);
  const now = new Date();
  const supportScope = { userId: caller.id, taskId: task.id };
  const supportLog = await withRecordedHelp(
    db,
    supportScope,
    await withRecordedFixedStart(db, supportScope, input.support, now),
    now,
  );
  const ruleSetHash = (await loadCodingRuleSet(db, task.stageSlug)).hash;
  const privateVersion =
    task.privateFiles !== null && task.contentHash === input.contentHash
      ? { hash: await sha256Hex(task.privateFiles), files: task.privateFiles }
      : null;

  const locked = await withResourceLock(
    db,
    taskSubmissionLockId(caller.id, task.id),
    async () => {
      const saved = await db
        .select({ problemId: taskProblemResults.problemId })
        .from(taskProblemResults)
        .where(
          and(eq(taskProblemResults.userId, caller.id), eq(taskProblemResults.taskId, task.id)),
        );
      const [current] = await db
        .select({ definition: taskRevisions.definition })
        .from(taskRevisions)
        .where(
          and(eq(taskRevisions.taskId, task.id), eq(taskRevisions.contentHash, task.contentHash)),
        )
        .limit(1);
      const defined = readTaskDefinition(current?.definition ?? "");
      const currentProblems = defined.problems ?? [];
      const passedIds = new Set(saved.map((row) => row.problemId));
      passedIds.add(problemId);
      const passedProblems = currentProblems.filter((problem) => passedIds.has(problem.id)).length;
      const totalProblems = currentProblems.length;
      const [progress] = await db
        .select({ status: taskProgress.status })
        .from(taskProgress)
        .where(and(eq(taskProgress.userId, caller.id), eq(taskProgress.taskId, task.id)))
        .limit(1);
      const [passedSubmission] = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.studentId, caller.id),
            eq(submissions.taskId, task.id),
            eq(submissions.verdict, "pass"),
          ),
        )
        .limit(1);
      const taskAlreadyPassed =
        progress?.status === "passed" ||
        progress?.status === "ai-passed" ||
        Boolean(passedSubmission);
      const complete = totalProblems > 0 && passedProblems === totalProblems;
      let completionId: string | null = null;
      const writes: BatchItem<"sqlite">[] = [
        db
          .insert(taskProblemResults)
          .values({
            userId: caller.id,
            taskId: task.id,
            problemId,
            contentHash: input.contentHash,
            path: file.path,
            code,
            sha256: file.sha256,
            attempts: 1,
            firstPassedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              taskProblemResults.userId,
              taskProblemResults.taskId,
              taskProblemResults.problemId,
            ],
            set: {
              contentHash: input.contentHash,
              path: file.path,
              code,
              sha256: file.sha256,
              updatedAt: now,
              attempts: sql`${taskProblemResults.attempts} + 1`,
            },
          }),
        db
          .insert(taskProgress)
          .values({
            userId: caller.id,
            taskId: task.id,
            contentHash: input.contentHash,
            status: "local-passed",
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [taskProgress.userId, taskProgress.taskId],
            set: {
              contentHash: input.contentHash,
              status: "local-passed",
              updatedAt: now,
            },
            setWhere: sql`${taskProgress.status} not in ('passed', 'ai-passed')`,
          }),
      ];
      if (complete && !taskAlreadyPassed) {
        const [pending] = await db
          .select({ id: submissions.id })
          .from(submissions)
          .where(
            and(
              eq(submissions.studentId, caller.id),
              eq(submissions.taskId, task.id),
              isNull(submissions.verdict),
              isNull(submissions.aiReviewStatus),
              sql`json_extract(${submissions.localResult}, '$.problemId') is not null`,
            ),
          )
          .limit(1);
        completionId = pending?.id ?? crypto.randomUUID();
        if (!pending) {
          const attempt = sql`(select coalesce(max(attempt), 0) + 1 from submissions where student_id = ${caller.id} and task_id = ${task.id})`;
          writes.push(
            db.insert(submissions).values({
              id: completionId,
              studentId: caller.id,
              taskId: task.id,
              taskContentHash: task.contentHash,
              taskKind: bundle.manifest.kind,
              submissionMode: "submit",
              localResult: input.localResult,
              testHashes: input.protected,
              explanation: "",
              debuggingRecord: null,
              supportLog,
              machineCheck: verified.check,
              taskSnapshot: {
                ...bundle,
                files: { "README.md": bundle.files["README.md"] ?? "" },
              },
              assessedSkills: defined.assesses,
              stageTitle: task.stageTitle,
              sectionTitle: task.sectionTitle,
              assignmentTitle: bundle.manifest.title,
              code: "",
              attempt,
              submittedAt: now,
              aiReviewStatus: null,
              taskPrivateHash: privateVersion?.hash ?? null,
              ruleSetHash,
            }),
          );
          if (privateVersion)
            writes.push(
              db
                .insert(taskPrivateVersions)
                .values({
                  taskId: task.id,
                  privateHash: privateVersion.hash,
                  files: privateVersion.files,
                  createdAt: now,
                })
                .onConflictDoNothing(),
            );
        }
      }
      await db.batch(writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
      return {
        passedProblems,
        totalProblems,
        taskPassed: taskAlreadyPassed,
        completionId,
      };
    },
    { ttlMs: 120_000 },
  );
  if (!locked.ran) throw new ApiError("別の提出を保存中です。もう一度提出してください", 409);
  let taskPassed = locked.value.taskPassed;
  if (locked.value.completionId) {
    await reviewTaskSubmission(db, caller, locked.value.completionId, "pass", "", "tests");
    taskPassed = true;
  }
  return {
    problemId,
    passedProblems: locked.value.passedProblems,
    totalProblems: locked.value.totalProblems,
    taskPassed,
  };
}
