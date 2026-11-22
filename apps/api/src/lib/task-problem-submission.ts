import { and, eq, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { TaskProblem } from "@stella/shared/tasks/problems";
import { parsePublicTaskBundle, type TaskBundle } from "@stella/shared/tasks/catalog";
import { verifyTaskSubmission, type TaskSubmissionInput } from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import {
  sections,
  stages,
  submissions,
  taskPrivate,
  taskPrivateVersions,
  taskProblemResults,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import { ApiError, type Caller } from "./authz.js";
import { canAccessTask } from "./task-access.js";
import { loadCodingRuleSet } from "./coding-rule-set.js";
import { withResourceLock } from "./resource-lock.js";
import { withRecordedFixedStart } from "./task-fixed-start.js";
import { withRecordedHelp } from "./task-help.js";
import { planProblemStepProgressWrites } from "./lesson-progress-write.js";
import {
  loadTaskProblemHashes,
  countableProblemResults,
  submittedProblemDependencies,
  type SavedProblemResult,
  type ProblemRevisionHashes,
} from "./task-problem-hashes.js";
import { evaluatedProblemSteps, loadProblemSteps } from "./task-problem-steps.js";
import {
  recomputeTaskProgress,
  reviewTaskSubmission,
  taskSubmissionLockId,
} from "./task-submission.js";

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

/** 合格済みなら全版、未合格なら今の版と、指紋が一致する前の版の問題を数える。 */
export function countedProblemIds(
  rows: readonly SavedProblemResult[],
  currentHash: string,
  taskPassed: boolean,
  revisions?: ProblemRevisionHashes,
): Set<string> {
  return new Set(
    countableProblemResults(rows, currentHash, taskPassed, revisions).map((row) => row.problemId),
  );
}

export interface TaskDefinitionView {
  problems: TaskProblem[] | null;
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
  const problems: TaskProblem[] = [];
  const seen = new Set<string>();
  for (const item of record.problems) {
    if (!item || typeof item !== "object") continue;
    const id = "id" in item && typeof item.id === "string" ? item.id : "";
    const title = "title" in item && typeof item.title === "string" ? item.title.trim() : "";
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    const after = "after" in item && typeof item.after === "string" ? item.after : "";
    problems.push({ id, title, ...(after ? { after } : {}) });
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

export function assertCurrentProblemSubmission(contentHash: string, currentHash: string) {
  if (contentHash !== currentHash)
    throw new ApiError(
      "教材が更新されています。Web の課題文から「VS Code で開く」を押してください",
      409,
    );
}

export function pendingProblemCompletion(userId: string, taskId: string) {
  return and(
    eq(submissions.studentId, userId),
    eq(submissions.taskId, taskId),
    eq(submissions.submissionMode, "submit"),
    isNull(submissions.verdict),
    isNull(submissions.aiReviewStatus),
    sql`json_type(case when json_valid(${submissions.taskSnapshot}) then ${submissions.taskSnapshot} end, '$.manifest.problems') = 'array'`,
  );
}

function nextAttempt(userId: string, taskId: string) {
  return sql`(select coalesce(max(attempt), 0) + 1 from submissions where student_id = ${userId} and task_id = ${taskId})`;
}

async function problemCompletionMetadata(
  db: Db,
  userId: string,
  task: ProblemTask,
  now: Date,
  support: TaskSubmissionInput["support"] = [],
) {
  const scope = { userId, taskId: task.id };
  const supportLog = await withRecordedHelp(
    db,
    scope,
    await withRecordedFixedStart(db, scope, support, now),
    now,
  );
  const ruleSetHash = (await loadCodingRuleSet(db, task.stageSlug)).hash;
  const privateVersion =
    task.privateFiles === null
      ? null
      : { hash: await sha256Hex(task.privateFiles), files: task.privateFiles };
  return { supportLog, ruleSetHash, privateVersion };
}

type SubmissionInsert = typeof submissions.$inferInsert;

/** 課題ロック内で、同じ版の未確定の提出を共有する。 */
async function appendProblemCompletion(
  db: Db,
  userId: string,
  task: ProblemTask,
  bundle: TaskBundle,
  assesses: string[],
  writes: BatchItem<"sqlite">[],
  now: Date,
  {
    supportLog,
    ruleSetHash,
    privateVersion,
  }: Awaited<ReturnType<typeof problemCompletionMetadata>>,
  local?: Pick<SubmissionInsert, "localResult" | "testHashes" | "machineCheck">,
) {
  const [pending] = await db
    .select({ id: submissions.id, hash: submissions.taskContentHash })
    .from(submissions)
    .where(pendingProblemCompletion(userId, task.id))
    .limit(1);
  if (pending?.hash === task.contentHash) return pending.id;
  const values = {
    taskContentHash: task.contentHash,
    taskKind: bundle.manifest.kind,
    localResult: local?.localResult ?? null,
    testHashes: local?.testHashes ?? null,
    machineCheck: local?.machineCheck ?? null,
    explanation: "",
    debuggingRecord: null,
    supportLog,
    taskSnapshot: { ...bundle, files: { "README.md": bundle.files["README.md"] ?? "" } },
    assessedSkills: assesses,
    stageTitle: task.stageTitle,
    sectionTitle: task.sectionTitle,
    assignmentTitle: bundle.manifest.title,
    code: "",
    submittedAt: now,
    taskPrivateHash: privateVersion?.hash ?? null,
    ruleSetHash,
  } satisfies Partial<SubmissionInsert>;
  const id = pending?.id ?? crypto.randomUUID();
  writes.push(
    pending
      ? db.update(submissions).set(values).where(eq(submissions.id, id))
      : db.insert(submissions).values({
          ...values,
          id,
          studentId: userId,
          taskId: task.id,
          submissionMode: "submit",
          attempt: nextAttempt(userId, task.id),
          aiReviewStatus: null,
        }),
  );
  if (privateVersion) {
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
  return id;
}

/** 管理者が最後の問題を済みにしたときと、手動の結果だけが引き継がれたときの合格。 */
export function manualTaskPassWrites(
  db: Db,
  userId: string,
  taskId: string,
  task: Pick<
    SubmissionInsert,
    "taskContentHash" | "taskKind" | "stageTitle" | "sectionTitle" | "assignmentTitle"
  >,
  reviewerId: string | null,
  reason: string,
  now: Date,
) {
  return [
    db.insert(submissions).values({
      ...task,
      id: crypto.randomUUID(),
      studentId: userId,
      taskId,
      submissionMode: "submit",
      code: "",
      reviewSource: "manual",
      verdict: "pass",
      status: "passed",
      reviewerId,
      reviewNotes: reason,
      reviewTaskContentHash: task.taskContentHash,
      submittedAt: now,
      reviewedAt: now,
      attempt: nextAttempt(userId, taskId),
    }),
    recomputeTaskProgress(db, { studentId: userId, taskId }, now),
  ] as const;
}

/** 問題の結果一覧を開いた時点で、引き継いだ結果だけでそろった課題の合格を記録する。 */
export async function completeCarriedProblemTask(
  db: Db,
  caller: Caller,
  taskId: string,
  expectedHash: string,
): Promise<boolean> {
  const locked = await withResourceLock(
    db,
    taskSubmissionLockId(caller.id, taskId),
    async () => {
      const [task] = await db
        .select({
          id: tasks.id,
          stageId: stages.id,
          stageTitle: stages.title,
          stageSlug: stages.slug,
          sectionTitle: sections.title,
          variantOf: tasks.variantOf,
          contentHash: tasks.contentHash,
          definition: taskRevisions.definition,
          bundle: taskRevisions.bundle,
          privateFiles: taskPrivate.files,
        })
        .from(tasks)
        .innerJoin(sections, eq(sections.id, tasks.sectionId))
        .innerJoin(stages, eq(stages.id, sections.stageId))
        .innerJoin(
          taskRevisions,
          and(eq(taskRevisions.taskId, tasks.id), eq(taskRevisions.contentHash, tasks.contentHash)),
        )
        .leftJoin(taskPrivate, eq(taskPrivate.taskId, tasks.id))
        .where(and(eq(tasks.id, taskId), eq(tasks.active, true)))
        .limit(1);
      if (!task || task.contentHash !== expectedHash) return { passed: false };
      const [progress] = await db
        .select({ status: taskProgress.status })
        .from(taskProgress)
        .where(and(eq(taskProgress.taskId, taskId), eq(taskProgress.userId, caller.id)))
        .limit(1);
      if (progress?.status === "passed" || progress?.status === "ai-passed")
        return { passed: true };
      // 人が差し戻した課題は、一覧を開いただけでは合格し直さない。
      if (progress?.status === "resubmit") return { passed: false };
      const [pass] = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.taskId, taskId),
            eq(submissions.studentId, caller.id),
            eq(submissions.verdict, "pass"),
          ),
        )
        .limit(1);
      if (pass) return { passed: true };
      if (!(await canAccessTask(db, caller, task, "write"))) return { passed: false };
      const { problems, assesses } = readTaskDefinition(task.definition);
      if (!problems) return { passed: false };
      const saved = await db
        .select()
        .from(taskProblemResults)
        .where(
          and(eq(taskProblemResults.taskId, taskId), eq(taskProblemResults.userId, caller.id)),
        );
      const hashes = await loadTaskProblemHashes(db, {
        taskId,
        currentHash: expectedHash,
        rows: saved,
      });
      const counted = countableProblemResults(saved, expectedHash, false, hashes);
      const currentIds = new Set(problems.map((problem) => problem.id));
      const results = counted.filter((row) => currentIds.has(row.problemId));
      if (
        results.length !== problems.length ||
        !results.some((row) => row.contentHash !== expectedHash)
      )
        return { passed: false };

      const bundle = parsePublicTaskBundle(JSON.parse(task.bundle));
      const now = new Date();
      if (results.every((row) => row.source === "manual")) {
        const last = results.reduce((latest, row) =>
          row.updatedAt > latest.updatedAt ? row : latest,
        );
        await db.batch(
          manualTaskPassWrites(
            db,
            caller.id,
            taskId,
            {
              taskContentHash: expectedHash,
              taskKind: bundle.manifest.kind,
              stageTitle: task.stageTitle,
              sectionTitle: task.sectionTitle,
              assignmentTitle: bundle.manifest.title,
            },
            last.manualBy,
            last.manualReason ?? "",
            now,
          ),
        );
        return { passed: true };
      }
      const metadata = await problemCompletionMetadata(db, caller.id, task, now);
      const writes: BatchItem<"sqlite">[] = [];
      const completionId = await appendProblemCompletion(
        db,
        caller.id,
        task,
        bundle,
        assesses,
        writes,
        now,
        metadata,
      );
      const [first, ...rest] = writes;
      if (first) await db.batch([first, ...rest]);
      return { passed: false, completionId };
    },
    { ttlMs: 120_000 },
  );
  if (!locked.ran) return false;
  if (locked.value.completionId) {
    await reviewTaskSubmission(db, caller, locked.value.completionId, "pass", "", "tests");
    return true;
  }
  return locked.value.passed;
}

/**
 * 問題つきの課題の提出。照合に落ちたら何も書かない。AI の待ち行列には積まない。
 * 数える問題が全部そろって、まだ合格していなければ、課題の提出を 1 行作って
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
  assertCurrentProblemSubmission(input.contentHash, task.contentHash);
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
  const problemDependencies = submittedProblemDependencies(bundle, file.path, code);
  const now = new Date();
  const metadata = await problemCompletionMetadata(db, caller.id, task, now, input.support);

  const locked = await withResourceLock(
    db,
    taskSubmissionLockId(caller.id, task.id),
    async () => {
      const saved = await db
        .select({
          problemId: taskProblemResults.problemId,
          source: taskProblemResults.source,
          contentHash: taskProblemResults.contentHash,
          path: taskProblemResults.path,
          code: taskProblemResults.code,
        })
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
      const [progress] = await db
        .select({ status: taskProgress.status })
        .from(taskProgress)
        .where(and(eq(taskProgress.userId, caller.id), eq(taskProgress.taskId, task.id)))
        .limit(1);
      const passedSubmissions = await db
        .select({ id: submissions.id, reviewSource: submissions.reviewSource })
        .from(submissions)
        .where(
          and(
            eq(submissions.studentId, caller.id),
            eq(submissions.taskId, task.id),
            eq(submissions.verdict, "pass"),
          ),
        );
      const taskAlreadyPassed =
        progress?.status === "passed" ||
        progress?.status === "ai-passed" ||
        passedSubmissions.length > 0;
      const canReplaceManualPass =
        passedSubmissions.length > 0 &&
        passedSubmissions.every((row) => row.reviewSource === "manual");
      const hashes = await loadTaskProblemHashes(db, {
        taskId: task.id,
        currentHash: task.contentHash,
        rows: saved,
        taskPassed: taskAlreadyPassed && !canReplaceManualPass,
      });
      const passedIds = countedProblemIds(saved, task.contentHash, taskAlreadyPassed, hashes);
      let stepLessonId: string | undefined;
      if (bundle.manifest.problemSteps) {
        const rows = await loadProblemSteps(db, caller.id, { taskId: task.id });
        const step = evaluatedProblemSteps(rows, currentProblems, passedIds).find(
          (row) => row.problemId === problemId,
        );
        if (!step)
          throw new ApiError("問題の準備中です。少し待ってからもう一度開いてください。", 503);
        if (step.state === "locked-video")
          throw new ApiError(
            `この問題はまだ解けません。先に${step.afterTitle}の動画を見てください。`,
            409,
          );
        if (step.state === "locked-previous")
          throw new ApiError("この問題はまだ解けません。先に前の問題を提出してください。", 409);
        stepLessonId = step.stepLessonId;
      }
      const submitted = [
        ...saved.filter((row) => row.problemId !== problemId),
        {
          problemId,
          source: "tests" as const,
          contentHash: task.contentHash,
          path: file.path,
          code,
        },
      ];
      const completedIds = countedProblemIds(
        submitted,
        task.contentHash,
        taskAlreadyPassed,
        hashes,
      );
      const passedProblems = currentProblems.filter((problem) =>
        completedIds.has(problem.id),
      ).length;
      const totalProblems = currentProblems.length;
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
            problemDependencies,
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
              problemDependencies,
              sha256: file.sha256,
              updatedAt: now,
              source: "tests",
              manualReason: null,
              manualBy: null,
              manualAt: null,
              firstPassedAt: sql`case when ${taskProblemResults.source} = 'manual' then ${now.getTime()} else ${taskProblemResults.firstPassedAt} end`,
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
      if (stepLessonId)
        writes.push(...planProblemStepProgressWrites(db, caller.id, [stepLessonId], now));
      const personalIds = canReplaceManualPass
        ? countedProblemIds(
            submitted.filter((row) => row.source === "tests"),
            task.contentHash,
            false,
            hashes,
          )
        : undefined;
      const replacesManualPass =
        personalIds && currentProblems.every((problem) => personalIds.has(problem.id));
      if (complete && (!taskAlreadyPassed || replacesManualPass)) {
        completionId = await appendProblemCompletion(
          db,
          caller.id,
          task,
          bundle,
          defined.assesses,
          writes,
          now,
          metadata,
          {
            localResult: input.localResult,
            testHashes: input.protected,
            machineCheck: verified.check,
          },
        );
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
