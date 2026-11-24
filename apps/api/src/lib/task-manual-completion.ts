import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type {
  ManualCompletionRequest,
  ManualCompletionView,
  ManualRevokeResult,
} from "@stella/shared/tasks/manual-completion";
import { parsePublicTaskBundle } from "@stella/shared/tasks/catalog";
import { problemFiles } from "@stella/shared/tasks/problems";
import { RUNNERS } from "@stella/shared/tasks/runners";
import type { Db } from "../db/client.js";
import {
  profiles,
  sections,
  stages,
  submissions,
  taskProblemResults,
  taskProgress,
  tasks,
} from "../db/schema.js";
import { ApiError, type Caller } from "./authz.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";
import { auditLogInsert } from "./audit.js";
import { loadProblemRevisionHashes, loadTaskProblemHashes } from "./task-problem-hashes.js";
import {
  countedProblemIds,
  manualTaskPassWrites,
  pendingProblemCompletion,
  readTaskDefinition,
} from "./task-problem-submission.js";
import { recomputeTaskProgress, resetPassedAt, taskSubmissionLockId } from "./task-submission.js";
import { withResourceLock } from "./resource-lock.js";
import { autoCompleteStagesIfMet, reclaimAutoCertificatesIfUnmet } from "./stage-auto-complete.js";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function id(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 500;
}
/** 重複した指定は拒否し、件数と監査の意味を一意にする。 */
export function parseManualCompletion(raw: unknown, revoke = false): ManualCompletionRequest {
  if (
    !object(raw) ||
    !id(raw.userId) ||
    !id(raw.stageId) ||
    !Array.isArray(raw.items) ||
    raw.items.length === 0 ||
    raw.items.length > 2000
  )
    throw new ApiError("利用者・ステージ・課題を指定してください", 400);
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!revoke && (!reason || reason.length > 1000))
    throw new ApiError("理由を1〜1000文字で入力してください", 400);
  const seen = new Set<string>();
  const items = raw.items.map((item) => {
    if (!object(item) || !id(item.taskId) || seen.has(item.taskId))
      throw new ApiError("課題の指定が不正または重複しています", 400);
    seen.add(item.taskId);
    if (item.problemIds === undefined) return { taskId: item.taskId };
    if (
      !Array.isArray(item.problemIds) ||
      item.problemIds.length === 0 ||
      item.problemIds.length > 5000 ||
      !item.problemIds.every(id) ||
      new Set(item.problemIds).size !== item.problemIds.length
    )
      throw new ApiError("問題の指定が不正または重複しています", 400);
    return { taskId: item.taskId, problemIds: item.problemIds as string[] };
  });
  return { userId: raw.userId, stageId: raw.stageId, items, reason };
}

export async function loadManualCompletionScope(db: Db, userId: string, stageId: string) {
  if (!id(userId) || !id(stageId)) throw new ApiError("利用者とステージを指定してください", 400);
  const [user] = await db
    .select({ id: profiles.id, disabled: profiles.disabled, displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!user || user.disabled) throw new ApiError("対象の利用者が存在しないか無効です", 400);
  const [stage] = await db
    .select({ id: stages.id, title: stages.title })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (!stage) throw new ApiError("ステージが見つかりません", 400);
  const units = await db
    .select({ id: sections.id, title: sections.title })
    .from(sections)
    .where(eq(sections.stageId, stageId))
    .orderBy(asc(sections.order));
  const taskRows = await db
    .select({ task: tasks, unitTitle: sections.title })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .where(and(eq(sections.stageId, stageId), eq(tasks.active, true), isNull(tasks.variantOf)))
    .orderBy(asc(sections.order), asc(tasks.order));
  return { user, stage, units, taskRows };
}

export async function readManualCompletion(
  db: Db,
  userId: string,
  stageId: string,
): Promise<ManualCompletionView & { userName: string; stageTitle: string }> {
  const scope = await loadManualCompletionScope(db, userId, stageId);
  const result: ManualCompletionView & { userName: string; stageTitle: string } = {
    userName: scope.user.displayName,
    stageTitle: scope.stage.title,
    userId,
    stageId,
    units: scope.units.map((unit) => ({ ...unit, tasks: [] })),
  };
  const batches = await Promise.all(
    chunk(
      scope.taskRows.map(({ task }) => task.id),
      D1_MAX_BOUND_PARAMS - 2,
    ).map((ids) =>
      Promise.all([
        db
          .select({ taskId: taskProgress.taskId, status: taskProgress.status })
          .from(taskProgress)
          .where(and(eq(taskProgress.userId, userId), inArray(taskProgress.taskId, ids))),
        db
          .select({
            taskId: submissions.taskId,
            reviewSource: submissions.reviewSource,
            reviewNotes: submissions.reviewNotes,
          })
          .from(submissions)
          .where(
            and(
              eq(submissions.studentId, userId),
              inArray(submissions.taskId, ids),
              eq(submissions.verdict, "pass"),
            ),
          )
          .orderBy(desc(submissions.attempt)),
        db
          .select({
            taskId: taskProblemResults.taskId,
            problemId: taskProblemResults.problemId,
            contentHash: taskProblemResults.contentHash,
            source: taskProblemResults.source,
            manualReason: taskProblemResults.manualReason,
            manualAt: taskProblemResults.manualAt,
            path: taskProblemResults.path,
            code: taskProblemResults.code,
            manualByName: profiles.displayName,
          })
          .from(taskProblemResults)
          .leftJoin(profiles, eq(profiles.id, taskProblemResults.manualBy))
          .where(
            and(eq(taskProblemResults.userId, userId), inArray(taskProblemResults.taskId, ids)),
          ),
      ]),
    ),
  );
  const progressByTask = new Map(batches.flatMap(([rows]) => rows).map((row) => [row.taskId, row]));
  const passByTask = new Map<string, (typeof batches)[number][1][number]>();
  const savedByTask = new Map<string, (typeof batches)[number][2]>();
  for (const [, passes, saved] of batches) {
    for (const row of passes) {
      if (row.taskId && !passByTask.has(row.taskId)) passByTask.set(row.taskId, row);
    }
    for (const row of saved) {
      const rows = savedByTask.get(row.taskId) ?? [];
      rows.push(row);
      savedByTask.set(row.taskId, rows);
    }
  }
  const hashes = await loadProblemRevisionHashes(
    db,
    scope.taskRows.map(({ task }) => ({
      taskId: task.id,
      currentHash: task.contentHash,
      rows: savedByTask.get(task.id) ?? [],
      taskPassed: passByTask.has(task.id),
    })),
  );
  for (const { task } of scope.taskRows) {
    const progress = progressByTask.get(task.id);
    const pass = passByTask.get(task.id);
    const saved = savedByTask.get(task.id) ?? [];
    const problems = readTaskDefinition(task.definition).problems ?? [];
    const currentProblemIds = new Set(problems.map((problem) => problem.id));
    const counted = countedProblemIds(saved, task.contentHash, Boolean(pass), hashes.get(task.id));
    result.units
      .find((unit) => unit.id === task.sectionId)
      ?.tasks.push({
        id: task.id,
        title: task.title,
        status: progress?.status ?? "not-started",
        reviewSource: pass?.reviewSource ?? null,
        manualReason: pass?.reviewSource === "manual" ? pass.reviewNotes : null,
        obsoleteManualProblems: saved.filter(
          (row) => row.source === "manual" && !currentProblemIds.has(row.problemId),
        ).length,
        problems: problems.map((problem) => {
          const row = counted.has(problem.id)
            ? saved.find((r) => r.problemId === problem.id)
            : undefined;
          return {
            ...problem,
            status: row ? "passed" : "not-submitted",
            source: row?.source ?? null,
            manualReason: row?.manualReason ?? null,
            manualByName: row?.manualByName ?? null,
            manualAt: row?.manualAt?.toISOString() ?? null,
          };
        }),
      });
  }
  return result;
}

/** DBに触れず、課題への所属・問題ID・ソースのパスを検証する。 */
export function planManualCompletion(
  taskRows: Awaited<ReturnType<typeof loadManualCompletionScope>>["taskRows"],
  items: ManualCompletionRequest["items"],
) {
  return items.map((item) => {
    const entry = taskRows.find((row) => row.task.id === item.taskId);
    if (!entry) throw new ApiError("ステージにない課題は指定できません", 400);
    const problems = readTaskDefinition(entry.task.definition).problems;
    if (
      item.problemIds &&
      (!problems || item.problemIds.some((pid) => !problems.some((p) => p.id === pid)))
    )
      throw new ApiError("課題のいまのバージョンにない問題は指定できません", 400);
    const selected = item.problemIds ?? problems?.map((p) => p.id) ?? [];
    const bundle = parsePublicTaskBundle(JSON.parse(entry.task.bundle));
    const paths = new Map(
      selected.map((pid) => {
        const paths = problemFiles(RUNNERS[bundle.manifest.runner].plan, pid);
        if (!paths) throw new ApiError("問題のソースのパスを決められません", 400);
        return [pid, paths.source];
      }),
    );
    return { ...entry, problems, selected, paths, wholeTask: item.problemIds === undefined };
  });
}

/** 全対象を先に検証してから書く。問題の数を IN 句に並べない。各文は100バインド未満。 */
export async function writeManualCompletion(
  db: Db,
  caller: Caller,
  input: ManualCompletionRequest,
  revoke = false,
  ip: string | null = null,
) {
  const scope = await loadManualCompletionScope(db, input.userId, input.stageId);
  const planned = planManualCompletion(scope.taskRows, input.items);
  let inserted = 0;
  let skipped = 0;
  let deleted = 0;
  let savedAny = false;
  const passedTaskIds: string[] = [];
  const blocked: ManualRevokeResult["blocked"] = [];
  const stageInput = { actor: caller, userId: input.userId, stageIds: [input.stageId], ip };
  const reconcileStage = () =>
    revoke
      ? reclaimAutoCertificatesIfUnmet(db, stageInput)
      : autoCompleteStagesIfMet(db, stageInput);
  try {
    for (const { task, unitTitle, problems, selected, paths, wholeTask } of planned) {
      const locked = await withResourceLock(
        db,
        taskSubmissionLockId(input.userId, task.id),
        async () => {
          const now = new Date();
          const saved = await db
            .select()
            .from(taskProblemResults)
            .where(
              and(
                eq(taskProblemResults.userId, input.userId),
                eq(taskProblemResults.taskId, task.id),
              ),
            );
          const passes = await db
            .select()
            .from(submissions)
            .where(
              and(
                eq(submissions.studentId, input.userId),
                eq(submissions.taskId, task.id),
                eq(submissions.verdict, "pass"),
              ),
            );
          const [progress] = await db
            .select({ status: taskProgress.status })
            .from(taskProgress)
            .where(and(eq(taskProgress.userId, input.userId), eq(taskProgress.taskId, task.id)))
            .limit(1);
          const taskPassed =
            passes.length > 0 || progress?.status === "passed" || progress?.status === "ai-passed";
          const writes: BatchItem<"sqlite">[] = [];
          const hashes = await loadTaskProblemHashes(db, {
            taskId: task.id,
            currentHash: task.contentHash,
            rows: saved,
            taskPassed: taskPassed && !revoke,
          });
          const counted = countedProblemIds(saved, task.contentHash, taskPassed, hashes);
          let problemCount = 0;
          if (revoke) {
            const personalPass = passes.some((p) => p.reviewSource !== "manual");
            const currentIds = new Set(problems?.map((p) => p.id) ?? []);
            const removable = saved.filter(
              (r) =>
                r.source === "manual" &&
                (wholeTask || selected.includes(r.problemId)) &&
                (!personalPass || (wholeTask && !currentIds.has(r.problemId))),
            );
            if (personalPass && (!wholeTask || removable.length === 0)) {
              const reason = "本人の提出またはレビューで合格した課題の手で済みは取り消せません";
              blocked.push({ taskId: task.id, reason });
              return;
            }
            for (const rows of chunk(removable, 90))
              writes.push(
                db.delete(taskProblemResults).where(
                  and(
                    eq(taskProblemResults.userId, input.userId),
                    eq(taskProblemResults.taskId, task.id),
                    inArray(
                      taskProblemResults.problemId,
                      rows.map((row) => row.problemId),
                    ),
                    eq(taskProblemResults.source, "manual"),
                  ),
                ),
              );
            deleted += removable.length;
            problemCount = removable.length;
            for (const pid of (wholeTask ? [] : selected).filter(
              (pid) => !removable.some((r) => r.problemId === pid),
            ))
              blocked.push({
                taskId: task.id,
                problemId: pid,
                reason: "手で済みにした問題ではありません",
              });
            if (
              personalPass &&
              saved.some((r) => r.source === "manual" && currentIds.has(r.problemId))
            ) {
              blocked.push({
                taskId: task.id,
                reason: "本人の提出またはレビューで合格した課題の手で済みは取り消せません",
              });
            }
            const removedIds = new Set(removable.map((row) => row.problemId));
            const remainingIds = countedProblemIds(
              saved.filter((row) => !removedIds.has(row.problemId)),
              task.contentHash,
              false,
              hashes,
            );
            const cancelsCompletion =
              !personalPass &&
              removable.length > 0 &&
              problems &&
              !problems.every((problem) => remainingIds.has(problem.id));
            if (cancelsCompletion) {
              // 最後の問題の保存後、tests の確定がロックを取り直す前の提出も捨てる。
              // 相談や AI の確認待ちは対象にしない。
              writes.push(
                db.delete(submissions).where(pendingProblemCompletion(input.userId, task.id)),
              );
            }
            if (
              !personalPass &&
              (wholeTask || !problems || removable.length > 0) &&
              (passes.length > 0 || cancelsCompletion)
            ) {
              for (const pass of passes)
                writes.push(
                  db
                    .delete(submissions)
                    .where(
                      and(eq(submissions.id, pass.id), eq(submissions.reviewSource, "manual")),
                    ),
                );
              if (!problems || removable.length === 0) deleted += passes.length;
              writes.push(
                db
                  .delete(taskProgress)
                  .where(
                    and(eq(taskProgress.userId, input.userId), eq(taskProgress.taskId, task.id)),
                  ),
              );
              writes.push(
                recomputeTaskProgress(db, { studentId: input.userId, taskId: task.id }, now),
              );
              if (saved.some((row) => row.source === "tests")) {
                writes.push(
                  db
                    .insert(taskProgress)
                    .values({
                      userId: input.userId,
                      taskId: task.id,
                      contentHash: task.contentHash,
                      status: "local-passed",
                      updatedAt: now,
                    })
                    // 提出が残れば直前の recompute の結果を尊重する。
                    // 行が無い = 提出なし・本人の問題だけ残る場合に限り local-passed。
                    .onConflictDoNothing({ target: [taskProgress.userId, taskProgress.taskId] }),
                );
              }
              writes.push(resetPassedAt(db, { studentId: input.userId, taskId: task.id }));
            } else if (!problems && !passes.length && removable.length === 0)
              blocked.push({ taskId: task.id, reason: "手で済みにした課題ではありません" });
          } else {
            const additions = selected.filter((pid) => !counted.has(pid));
            problemCount = additions.length;
            for (const ids of chunk(additions, 4))
              writes.push(
                db
                  .insert(taskProblemResults)
                  .values(
                    ids.map((pid) => ({
                      userId: input.userId,
                      taskId: task.id,
                      problemId: pid,
                      path: paths.get(pid) ?? "",
                      code: "",
                      sha256: "",
                      contentHash: task.contentHash,
                      source: "manual" as const,
                      manualReason: input.reason,
                      manualBy: caller.id,
                      manualAt: now,
                      attempts: 0,
                      firstPassedAt: now,
                      updatedAt: now,
                    })),
                  )
                  .onConflictDoUpdate({
                    target: [
                      taskProblemResults.userId,
                      taskProblemResults.taskId,
                      taskProblemResults.problemId,
                    ],
                    set: {
                      path: sql`excluded.path`,
                      code: sql`excluded.code`,
                      sha256: sql`excluded.sha256`,
                      problemDependencies: null,
                      contentHash: sql`excluded.content_hash`,
                      source: sql`excluded.source`,
                      manualReason: sql`excluded.manual_reason`,
                      manualBy: sql`excluded.manual_by`,
                      manualAt: sql`excluded.manual_at`,
                      attempts: sql`excluded.attempts`,
                      firstPassedAt: sql`excluded.first_passed_at`,
                      updatedAt: sql`excluded.updated_at`,
                    },
                  }),
              );
            inserted += additions.length;
            skipped += selected.length - additions.length;
            for (const pid of additions) counted.add(pid);
            const complete = !problems || problems.every((p) => counted.has(p.id));
            if (complete && !taskPassed) {
              writes.push(
                ...manualTaskPassWrites(
                  db,
                  input.userId,
                  task.id,
                  {
                    taskContentHash: task.contentHash,
                    taskKind: task.kind,
                    stageTitle: scope.stage.title,
                    sectionTitle: unitTitle,
                    assignmentTitle: task.title,
                  },
                  caller.id,
                  input.reason,
                  now,
                ),
              );
              passedTaskIds.push(task.id);
              if (!problems) inserted++;
            } else if (!problems) skipped++;
          }
          if (writes.length) {
            writes.push(
              auditLogInsert(db, caller, {
                action: revoke ? "task_manual_revoke" : "task_manual_complete",
                targetType: "task",
                targetId: task.id,
                ip,
                metadata: {
                  user_id: input.userId,
                  stage_id: input.stageId,
                  task_ids: [task.id],
                  problem_count: problemCount,
                  reason: revoke
                    ? (passes[0]?.reviewNotes ??
                      saved.find(
                        (row) =>
                          row.source === "manual" &&
                          (wholeTask || selected.includes(row.problemId)),
                      )?.manualReason ??
                      null)
                    : input.reason,
                },
              }),
            );
            const [first, ...rest] = writes;
            if (first) {
              await db.batch([first, ...rest]);
              savedAny = true;
            }
          }
        },
        { ttlMs: 120_000 },
      );
      if (!locked.ran)
        throw new ApiError(
          savedAny
            ? "一部は保存済みです。一覧を読み込み直してから、残りをもう一度操作してください"
            : "別の提出・レビューを保存中です。もう一度操作してください",
          409,
        );
    }
  } catch (error) {
    if (savedAny) {
      try {
        await reconcileStage();
      } catch (reconcileError) {
        console.error(
          "[task-manual-completion] 一部保存後のステージの付け直しに失敗",
          reconcileError,
        );
      }
    }
    throw error;
  }
  await reconcileStage();
  return { inserted, skipped, passedTaskIds, deleted, blocked };
}
