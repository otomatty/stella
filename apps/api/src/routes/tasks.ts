import { type Context, type Handler, Hono } from "hono";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { loadProblemRevisionHashes, type ProblemHashCache } from "../lib/task-problem-hashes.js";
import {
  completeCarriedProblemTask,
  countedProblemIds,
  readTaskDefinition,
} from "../lib/task-problem-submission.js";
import {
  bundleSizeProblem,
  parsePublicTaskBundle,
  type TaskBundleResponse,
  type TaskProblemItem,
  type TaskSummary,
} from "@stella/shared/tasks/catalog";
import {
  EXTENSION_VERSION_PARAM,
  extensionSatisfies,
  extensionUpgradeMessage,
  requiredExtensionVersion,
  requiredExtensionVersionForFiles,
} from "@stella/shared/tasks/extension-compat";
import { normalizeForHash, sha256Hex } from "@stella/shared/tasks/hash";
import { problemStepLabel } from "@stella/shared/tasks/problem-steps";
import { problemFiles, type TaskProblem } from "@stella/shared/tasks/problems";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import { type LocalRunReport, parseLocalRunReport } from "@stella/shared/tasks/local-report";
import { parseHelpContentHash, parseHelpOpenRequest } from "@stella/shared/tasks/help";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import {
  sections,
  taskFixedStarts,
  taskFixedStartUses,
  taskProblemResults,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import { ApiError, type Caller, errorResponse, getCaller } from "../lib/authz.js";
import { canAccessTask, canAccessTasks } from "../lib/task-access.js";
import { getTaskHelp, openTaskHelp } from "../lib/task-help.js";
import { loadStageStepLocks, PROBLEM_STEPS_NOT_READY } from "../lib/task-problem-steps.js";
import { loadTaskRefs } from "../lib/task-refs.js";
import { autoCompleteStagesIfMet } from "../lib/stage-auto-complete.js";
import { clientIp } from "../lib/audit.js";
import { localRunUpsert } from "../lib/task-support.js";

export const tasksRoute = new Hono<{ Bindings: Env }>();

async function stageTaskList(
  c: Context<{ Bindings: Env }, "/api/tasks/for-stage/:stageId">,
  finalize: boolean,
  hashCache?: ProblemHashCache,
): Promise<Response> {
  try {
    const { caller, db } = await getCaller(c);
    const stageId = c.req.param("stageId");
    if (!(await canAccessTasks(db, caller, stageId)))
      throw new ApiError("task stage not found", 404);
    // definition と bundle と task_private は一覧の SELECT に含めない。予備の類題 (#39) は
    // ステージの課題一覧に出さない (出題した受講者にだけ、今日の類題として出す)。
    const rows = await db
      .select({
        id: tasks.id,
        sectionId: tasks.sectionId,
        title: tasks.title,
        kind: tasks.kind,
        pattern: tasks.pattern,
        skills: tasks.skills,
        estimatedMinutes: tasks.estimatedMinutes,
        lessonId: tasks.lessonId,
        contentHash: tasks.contentHash,
        manual_passed:
          sql<boolean>`exists (select 1 from submissions where student_id = ${caller.id} and task_id = ${tasks.id} and verdict = 'pass' and review_source = 'manual')`.mapWith(
            Boolean,
          ),
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(and(eq(sections.stageId, stageId), eq(tasks.active, true), isNull(tasks.variantOf)))
      .orderBy(asc(sections.order), asc(tasks.order));
    const progress =
      rows.length === 0
        ? []
        : await db
            .select({
              taskId: taskProgress.taskId,
              status: taskProgress.status,
              contentHash: taskProgress.contentHash,
            })
            .from(taskProgress)
            .innerJoin(tasks, eq(tasks.id, taskProgress.taskId))
            .innerJoin(sections, eq(sections.id, tasks.sectionId))
            .where(
              and(
                eq(taskProgress.userId, caller.id),
                eq(sections.stageId, stageId),
                eq(tasks.active, true),
                isNull(tasks.variantOf),
              ),
            );
    const progressByTaskId = new Map(progress.map((p) => [p.taskId, p]));
    const [locks, refsByTask] = await Promise.all([
      rows.length ? loadStageStepLocks(db, caller.id, stageId, { hashCache }) : null,
      rows.length ? loadTaskRefs(db, caller, { stageId }) : undefined,
    ]);
    const possibleCompletions: { summary: TaskSummary; contentHash: string }[] = [];
    const result: (TaskSummary & { problems_total?: number; problems_passed?: number })[] =
      rows.map(({ contentHash, ...task }) => {
        const p = progressByTaskId.get(task.id);
        const status =
          p && (p.contentHash === contentHash || ["passed", "ai-passed"].includes(p.status))
            ? p.status
            : "not-started";
        const base = {
          ...task,
          kind: task.kind as TaskKind,
          status,
          refs: refsByTask?.get(task.id)?.get("") ?? [],
        };
        const problemTask = locks?.byTask.get(task.id);
        if (!problemTask) return base;
        const { problems, saved, counted: passed, ready, steps, plan } = problemTask;
        const manualResults = new Set(
          saved
            .filter((row) => row.source === "manual" && passed.has(row.problemId))
            .map((row) => row.problemId),
        );
        const problemRefs = (problemId: string) => refsByTask?.get(task.id)?.get(problemId) ?? [];
        const problemSteps = ready
          ? steps.map(({ blocking: _blocking, ...step }) => {
              const locked = step.state === "locked-video" || step.state === "locked-previous";
              return {
                id: step.id,
                title: step.title,
                label: step.label,
                stepLessonId: step.stepLessonId,
                state: step.state,
                refs: problemRefs(step.id),
                ...(locked
                  ? { afterLessonId: step.afterLessonId, afterTitle: step.afterTitle }
                  : {}),
                ...(step.state === "submitted" && manualResults.has(step.id)
                  ? { manual: true }
                  : {}),
              };
            })
          : undefined;
        const stepByProblem = new Map(problemSteps?.map((step) => [step.id, step]));
        const problemItems = problems.flatMap<TaskProblemItem>((problem, index) => {
          const paths = plan && problemFiles(plan, problem.id);
          if (!paths) return [];
          const step = stepByProblem.get(problem.id);
          if (step) return [{ ...step, source: paths.source }];
          const state = passed.has(problem.id)
            ? "submitted"
            : problem.after
              ? "locked-video"
              : "open";
          return [
            {
              id: problem.id,
              title: problem.title,
              label: problemStepLabel(problem.title, index),
              source: paths.source,
              state,
              ...(state === "submitted" && manualResults.has(problem.id) ? { manual: true } : {}),
              refs: problemRefs(problem.id).filter((ref) => !ref.auto),
            },
          ];
        });
        const summary = {
          ...base,
          ...(problemSteps ? { problems: problemSteps } : {}),
          problem_items: problemItems,
          problems_manual: manualResults.size,
          problems_total: problems.length,
          problems_passed: problems.filter((problem) => passed.has(problem.id)).length,
        };
        if (
          finalize &&
          status !== "passed" &&
          status !== "ai-passed" &&
          p?.status !== "resubmit" &&
          summary.problems_passed === problems.length &&
          saved.some((row) => row.contentHash !== contentHash && passed.has(row.problemId))
        ) {
          possibleCompletions.push({ summary, contentHash });
        }
        return summary;
      });
    let completedTask = false;
    let refresh = false;
    for (const { summary, contentHash } of possibleCompletions) {
      const completion = await completeCarriedProblemTask(
        db,
        caller,
        summary.id,
        contentHash,
        locks?.hashes,
      );
      if (completion === "refresh") refresh = true;
      else if (completion) {
        summary.status = "passed";
        completedTask = true;
      }
    }
    if (completedTask) {
      await autoCompleteStagesIfMet(db, {
        actor: caller,
        userId: caller.id,
        stageIds: [stageId],
        ip: clientIp(c),
      });
    }
    return refresh ? stageTaskList(c, false, locks?.hashes) : c.json({ tasks: result });
  } catch (err) {
    return errorResponse(c, err);
  }
}
tasksRoute.get("/api/tasks/for-stage/:stageId", (c) => stageTaskList(c, true));

/**
 * `after` の無い課題は、ロック判定をせず、この課題の結果だけを版とコードを同じ読み取りで数える。
 */
async function ungatedProblemResults(
  c: Context<{ Bindings: Env }>,
  db: Db,
  caller: Caller,
  finalize: boolean,
  hashCache: ProblemHashCache | undefined,
  row: { id: string; stageId: string; contentHash: string; problems: TaskProblem[] },
): Promise<Response> {
  const { problems } = row;
  const saved = await db
    .select({
      problemId: taskProblemResults.problemId,
      contentHash: taskProblemResults.contentHash,
      firstPassedAt: taskProblemResults.firstPassedAt,
      source: taskProblemResults.source,
      path: taskProblemResults.path,
      code: taskProblemResults.code,
    })
    .from(taskProblemResults)
    .where(and(eq(taskProblemResults.userId, caller.id), eq(taskProblemResults.taskId, row.id)));
  const [progress] = await db
    .select({ status: taskProgress.status })
    .from(taskProgress)
    .where(and(eq(taskProgress.userId, caller.id), eq(taskProgress.taskId, row.id)))
    .limit(1);
  let taskPassed = progress?.status === "passed" || progress?.status === "ai-passed";
  const cache = hashCache ?? new Map();
  const revisions = (
    await loadProblemRevisionHashes(
      db,
      [{ taskId: row.id, currentHash: row.contentHash, rows: saved, taskPassed }],
      cache,
    )
  ).get(row.id);
  const passedIds = countedProblemIds(saved, row.contentHash, taskPassed, revisions);
  const byId = new Map(
    saved
      .filter((item) => passedIds.has(item.problemId))
      .map((item) => [item.problemId, item.firstPassedAt]),
  );
  const passedProblems = problems.filter((problem) => passedIds.has(problem.id)).length;
  if (
    finalize &&
    !taskPassed &&
    progress?.status !== "resubmit" &&
    passedProblems === problems.length &&
    saved.some(
      (result) => passedIds.has(result.problemId) && result.contentHash !== row.contentHash,
    )
  ) {
    const completion = await completeCarriedProblemTask(db, caller, row.id, row.contentHash, cache);
    if (completion === "refresh") return ungatedProblemResults(c, db, caller, false, cache, row);
    taskPassed = completion;
    if (taskPassed) {
      await autoCompleteStagesIfMet(db, {
        actor: caller,
        userId: caller.id,
        stageIds: [row.stageId],
        ip: clientIp(c),
      });
    }
  }
  const refsByTask = await loadTaskRefs(db, caller, { taskId: row.id });
  const refsByProblem = refsByTask.get(row.id);
  return c.json({
    refs: refsByProblem?.get("") ?? [],
    problems: problems.map(({ id, title }) => {
      const firstPassedAt = byId.get(id);
      return {
        id,
        title,
        refs: (refsByProblem?.get(id) ?? []).filter((ref) => !ref.auto),
        status: firstPassedAt ? "passed" : "not-submitted",
        firstPassedAt: firstPassedAt ? firstPassedAt.toISOString() : null,
        source: firstPassedAt
          ? (saved.find((item) => item.problemId === id)?.source ?? "tests")
          : null,
      };
    }),
    passedProblems,
    totalProblems: problems.length,
    taskPassed,
  });
}

/**
 * 問題つきの課題の、本人の問題の状態。一覧は今の版の problems。問題の無い課題は 404。
 */
async function problemResults(
  c: Context<{ Bindings: Env }>,
  finalize: boolean,
  hashCache?: ProblemHashCache,
): Promise<Response> {
  try {
    const { caller, db } = await getCaller(c);
    const taskId = c.req.query("taskId") ?? "";
    const [row] = await db
      .select({
        id: tasks.id,
        stageId: sections.stageId,
        variantOf: tasks.variantOf,
        contentHash: tasks.contentHash,
        definition: taskRevisions.definition,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(
        taskRevisions,
        and(eq(taskRevisions.taskId, tasks.id), eq(taskRevisions.contentHash, tasks.contentHash)),
      )
      .where(and(eq(tasks.id, taskId), eq(tasks.active, true)))
      .limit(1);
    if (!row || !(await canAccessTask(db, caller, row)))
      throw new ApiError("課題が見つかりません", 404);
    const authored = readTaskDefinition(row.definition).problems;
    if (!authored) throw new ApiError("課題が見つかりません", 404);
    if (!authored.some((problem) => problem.after)) {
      return ungatedProblemResults(c, db, caller, finalize, hashCache, {
        id: row.id,
        stageId: row.stageId,
        contentHash: row.contentHash,
        problems: authored,
      });
    }
    const locks = await loadStageStepLocks(db, caller.id, row.stageId, {
      variantTaskId: row.variantOf === null ? undefined : row.id,
      hashCache,
    });
    const problemTask = locks.byTask.get(row.id);
    if (!problemTask) throw new ApiError("課題が見つかりません", 404);
    const { problems, saved, counted: passedIds, status } = problemTask;
    let taskPassed = status === "passed" || status === "ai-passed";
    const byId = new Map(
      saved
        .filter((item) => passedIds.has(item.problemId))
        .map((item) => [item.problemId, item.firstPassedAt]),
    );
    const passedProblems = problems.filter((problem) => passedIds.has(problem.id)).length;
    if (
      finalize &&
      !taskPassed &&
      status !== "resubmit" &&
      passedProblems === problems.length &&
      saved.some(
        (result) => passedIds.has(result.problemId) && result.contentHash !== row.contentHash,
      )
    ) {
      const completion = await completeCarriedProblemTask(
        db,
        caller,
        row.id,
        row.contentHash,
        locks.hashes,
      );
      if (completion === "refresh") return problemResults(c, false, locks.hashes);
      taskPassed = completion;
      if (taskPassed) {
        await autoCompleteStagesIfMet(db, {
          actor: caller,
          userId: caller.id,
          stageIds: [row.stageId],
          ip: clientIp(c),
        });
      }
    }
    if (problemTask.gated && !problemTask.ready) throw new ApiError(PROBLEM_STEPS_NOT_READY, 503);
    const steps = problemTask.ready ? problemTask.steps : undefined;
    const entries = steps
      ? steps.map(({ id, title, state, stepLessonId, afterLessonId, afterTitle }) => ({
          id,
          title,
          state,
          stepLessonId,
          ...(state === "locked-video" || state === "locked-previous"
            ? { afterLessonId, afterTitle }
            : {}),
        }))
      : problems.map(({ id, title }) => ({ id, title }));
    const refsByTask = await loadTaskRefs(db, caller, { taskId: row.id });
    const refsByProblem = refsByTask.get(row.id);
    return c.json({
      ...(steps ? { gated: true } : {}),
      refs: refsByProblem?.get("") ?? [],
      problems: entries.map((problem) => {
        const firstPassedAt = byId.get(problem.id);
        const refs = refsByProblem?.get(problem.id) ?? [];
        return {
          ...problem,
          refs: steps ? refs : refs.filter((ref) => !ref.auto),
          status: firstPassedAt ? "passed" : "not-submitted",
          firstPassedAt: firstPassedAt ? firstPassedAt.toISOString() : null,
          source: firstPassedAt
            ? (saved.find((row) => row.problemId === problem.id)?.source ?? "tests")
            : null,
        };
      }),
      passedProblems,
      totalProblems: problems.length,
      taskPassed,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
}
tasksRoute.get("/api/tasks/problem-results", (c) => problemResults(c, true));

function requireTaskExtensionVersion(c: Context<{ Bindings: Env }>, required: string | null) {
  if (required && !extensionSatisfies(c.req.query(EXTENSION_VERSION_PARAM), required))
    throw new ApiError(extensionUpgradeMessage(required), 426);
}

/**
 * 課題の配布ファイル (README・starter・tests・`.stella/task.json`)。private/・ヒント・
 * 固定した開始点は返さない。固定した開始点は「あるか」だけを返し、本体は下の POST で渡す。
 * ヒント・解答例・解説は解放条件を見て `/api/tasks/help` が返す。
 */
tasksRoute.get("/api/tasks/bundle", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const [row] = await db
      .select({
        id: tasks.id,
        bundle: tasks.bundle,
        contentHash: tasks.contentHash,
        stageId: sections.stageId,
        variantOf: tasks.variantOf,
        fixedStartHash: taskFixedStarts.contentHash,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .leftJoin(taskFixedStarts, eq(taskFixedStarts.taskId, tasks.id))
      .where(and(eq(tasks.id, c.req.query("taskId") ?? ""), eq(tasks.active, true)))
      .limit(1);
    // 予備の類題は出題した受講者にだけ配る (#39)。
    if (!row || !(await canAccessTask(db, caller, row))) throw new ApiError("task not found", 404);
    const bundle = parsePublicTaskBundle(JSON.parse(row.bundle));
    requireTaskExtensionVersion(
      c,
      requiredExtensionVersion(bundle.manifest, Object.keys(bundle.files)),
    );
    const response: TaskBundleResponse = {
      bundle,
      fixedStart: row.fixedStartHash === row.contentHash,
    };
    return c.json(response);
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 通常配布の過去のバージョンを照合するため、公開ファイルのハッシュだけを返す。 */
tasksRoute.get("/api/tasks/revision-files", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const [row] = await db
      .select({
        id: tasks.id,
        stageId: sections.stageId,
        variantOf: tasks.variantOf,
        bundle: taskRevisions.bundle,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(
        taskRevisions,
        and(
          eq(taskRevisions.taskId, tasks.id),
          eq(taskRevisions.contentHash, c.req.query("contentHash") ?? ""),
        ),
      )
      .where(and(eq(tasks.id, c.req.query("taskId") ?? ""), eq(tasks.active, true)))
      .limit(1);
    if (!row || !(await canAccessTask(db, caller, row))) throw new ApiError("task not found", 404);
    const { manifest, files } = parsePublicTaskBundle(JSON.parse(row.bundle));
    requireTaskExtensionVersion(c, requiredExtensionVersionForFiles(manifest, Object.keys(files)));
    const hashes = await Promise.all(
      Object.entries(files).map(async ([rel, encoded]) => {
        const bytes = Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0));
        return [rel, await sha256Hex(normalizeForHash(bytes))];
      }),
    );
    return c.json({ files: Object.fromEntries(hashes) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 版の定義 (教材の task.json) から、固定した開始点が実装を含む前の課題を読む。開始点のある
 * 版の定義と内容ハッシュは同じ seed で入るので、配る版 (`contentHash`) の定義を読めばよい。
 */
function fixedStartCovers(definition: string): string[] | null {
  const parsed = JSON.parse(definition) as { fixedStart?: { covers?: unknown } };
  const covers = parsed.fixedStart?.covers;
  return Array.isArray(covers) && covers.length > 0 && covers.every((id) => typeof id === "string")
    ? covers
    : null;
}

/**
 * 固定した開始点を渡す (01 §4・07 §4.4)。前の実装が壊れていて先へ進めない受講者向けで、
 * 前の課題の動く実装を含みうるので、渡す前に利用を記録する。記録できなければ渡さない。
 * 記録は提出の支援記録に `fixed-start` を足す根拠になる (lib/task-fixed-start.ts)。開始点が
 * 実装を含む前の課題も受け取りの行に残し、それらの課題の以後の提出も支援付きにする。
 */
tasksRoute.post("/api/tasks/fixed-start", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("invalid JSON", 400);
    }
    if (!body || typeof body !== "object" || !("taskId" in body) || typeof body.taskId !== "string")
      throw new ApiError("taskId is required", 400);
    const [row] = await db
      .select({
        id: tasks.id,
        bundle: tasks.bundle,
        contentHash: tasks.contentHash,
        definition: tasks.definition,
        stageId: sections.stageId,
        variantOf: tasks.variantOf,
        files: taskFixedStarts.files,
        fixedStartHash: taskFixedStarts.contentHash,
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .leftJoin(taskFixedStarts, eq(taskFixedStarts.taskId, tasks.id))
      .where(and(eq(tasks.id, body.taskId), eq(tasks.active, true)))
      .limit(1);
    if (!row || !(await canAccessTask(db, caller, row, "write")))
      throw new ApiError("task not found", 404);
    // seed 後に版が変わった開始点 (古い版のテストと組んだもの) は配らない。
    if (!row.files || row.fixedStartHash !== row.contentHash)
      throw new ApiError("この課題には固定した開始点がありません", 404);
    const { manifest } = parsePublicTaskBundle(JSON.parse(row.bundle));
    const bundle = parsePublicTaskBundle({
      manifest,
      contentHash: row.contentHash,
      files: JSON.parse(row.files),
    });
    requireTaskExtensionVersion(
      c,
      requiredExtensionVersionForFiles(manifest, Object.keys(bundle.files)),
    );
    // 教材の検査で止めているはずの大きさ。D1 に入ってしまっても配らず、利用も記録せずにログへ残す。
    const tooLarge = bundleSizeProblem(bundle.files);
    if (tooLarge) {
      console.error("[tasks] 固定した開始点が上限を超えています", row.id, tooLarge);
      throw new ApiError("固定した開始点を配れません。管理者に相談してください", 500);
    }
    await db
      .insert(taskFixedStartUses)
      .values({
        userId: caller.id,
        taskId: row.id,
        contentHash: row.contentHash,
        usedAt: new Date(),
        coveredTaskIds: fixedStartCovers(row.definition),
      })
      .onConflictDoNothing();
    return c.json({ bundle });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * ヒント・解答例・解説の解放の状態 (#36・07 §8)。`contentHash` は受講者の手元の版 (配布記録) で、
 * 本文はその版の素材のうち、その版で開いた記録があり今も開ける素材だけに付く。予備の類題と
 * レビューの観点は返さない。読むだけで記録はしない。
 */
tasksRoute.get("/api/tasks/help", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    let contentHash: string | undefined;
    try {
      contentHash = parseHelpContentHash(c.req.query("contentHash"));
    } catch (e) {
      throw new ApiError(e instanceof Error ? e.message : "invalid contentHash", 400);
    }
    return c.json(await getTaskHelp(db, caller, c.req.query("taskId") ?? "", contentHash));
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * ヒント 1 段・解答例・解説のどれかを開く。解放条件はサーバーが判定し、満たさなければ 403、
 * 手元の版 (`contentHash`) の素材が分からなければ 409 で何も返さない。開いたことを出した版で
 * 記録してから本文を返す (提出の支援記録に入る。罰ではなく記録)。
 */
tasksRoute.post("/api/tasks/help/open", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      throw new ApiError("invalid JSON", 400);
    }
    let request: ReturnType<typeof parseHelpOpenRequest>;
    try {
      request = parseHelpOpenRequest(raw);
    } catch (e) {
      throw new ApiError(e instanceof Error ? e.message : "invalid request", 400);
    }
    return c.json(await openTaskHelp(db, caller, request));
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 手元の確認の結果を受け取る (#38)。受け取るのは要約だけで、コードやメッセージは来ない。
 *
 * 合格は従来の `/api/tasks/local-result`、失敗・エラーは `/api/tasks/local-runs` に分ける。
 * 旧 API は local-result の本文を検証せずに合格として扱うので、失敗を同じ道で送ると、
 * API を戻したときに失敗が「手元で合格」として残ってしまう。別の道なら旧 API は 404 で捨てる。
 */
const handleLocalRun =
  (accepts: "passed" | "failures"): Handler<{ Bindings: Env }> =>
  async (c) => {
    try {
      const { caller, db } = await getCaller(c);
      let raw: unknown;
      try {
        raw = await c.req.json();
      } catch {
        throw new ApiError("invalid JSON", 400);
      }
      let body: LocalRunReport;
      try {
        body = parseLocalRunReport(raw);
      } catch (e) {
        throw new ApiError(e instanceof Error ? e.message : "invalid local result", 400);
      }
      if ((body.outcome === "passed") !== (accepts === "passed"))
        throw new ApiError(
          accepts === "passed"
            ? "失敗・エラーは /api/tasks/local-runs に送ってください"
            : "合格は /api/tasks/local-result に送ってください",
          400,
        );
      const [row] = await db
        .select({
          id: tasks.id,
          contentHash: tasks.contentHash,
          stageId: sections.stageId,
          variantOf: tasks.variantOf,
          definition: tasks.definition,
        })
        .from(tasks)
        .innerJoin(sections, eq(sections.id, tasks.sectionId))
        .where(and(eq(tasks.id, body.taskId), eq(tasks.active, true)))
        .limit(1);
      if (!row || !(await canAccessTask(db, caller, row, "write")))
        throw new ApiError("task not found", 404);
      if (row.contentHash !== body.contentHash)
        throw new ApiError("教材が更新されています。課題を開き直してください", 409);
      const runs = localRunUpsert(db, { userId: caller.id }, row, body);
      // 問題の確認結果は回数だけを記録し、課題の合格は全問の提出で決める。
      if (body.outcome !== "passed" || readTaskDefinition(row.definition).problems) {
        await runs;
        return c.json({ ok: true });
      }
      // 手元の合格は自己申告の記録。AI・講師の判定へ昇格させる経路にはしない。
      await db.batch([
        db
          .insert(taskProgress)
          .values({
            userId: caller.id,
            taskId: row.id,
            contentHash: row.contentHash,
            status: "local-passed",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [taskProgress.userId, taskProgress.taskId],
            set: { contentHash: row.contentHash, status: "local-passed", updatedAt: new Date() },
            setWhere: inArray(taskProgress.status, ["not-started", "local-passed", "resubmit"]),
          }),
        runs,
      ]);
      return c.json({ ok: true });
    } catch (err) {
      return errorResponse(c, err);
    }
  };

tasksRoute.post("/api/tasks/local-result", handleLocalRun("passed"));
tasksRoute.post("/api/tasks/local-runs", handleLocalRun("failures"));
