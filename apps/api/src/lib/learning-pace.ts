import { and, asc, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import {
  calculateLearningPace,
  LEARNING_PROGRAM_SLUGS,
  type LearningPace,
  type PaceSettings,
  type PaceStage,
  type PaceUnit,
  studyWeekStart,
} from "@stella/shared/study/pace";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import { toStudyDate } from "@stella/shared/study/activity";
import { evaluateSkillMap } from "@stella/shared/skill-map/evaluate";
import type { Db } from "../db/client.js";
import {
  contentUnits,
  enrollments,
  learningDiagnostics,
  learningPaceChanges,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  sections,
  stages,
  taskProblemResults,
  taskProgress,
  tasks,
} from "../db/schema.js";
import { ApiError, type Caller, isStaffRole, loadActiveStaffIds } from "./authz.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";
import { loadClearedStageIds, loadSkillMapSource, parsePrerequisites } from "./skill-map-data.js";
import { readTaskDefinition } from "./task-problem-submission.js";

/**
 * 問題つき課題の、今の版の問題数と提出済み数。課題ごとの SQL にはしない。
 * 問題の無い課題は Map に入れない（合格するまで完了時間は 0 のまま）。
 */
async function problemProgressOf(
  db: Db,
  userId: string,
  taskIds: string[],
): Promise<Map<string, { total: number; passed: number }>> {
  const progress = new Map<string, { total: number; passed: number }>();
  if (taskIds.length === 0) return progress;
  const definitions = (
    await Promise.all(
      chunk(taskIds, D1_MAX_BOUND_PARAMS - 1).map((batch) =>
        db
          .select({ id: tasks.id, definition: tasks.definition })
          .from(tasks)
          .where(
            and(
              inArray(tasks.id, batch),
              sql`json_type(${tasks.definition}, '$.problems') = 'array'`,
            ),
          ),
      ),
    )
  ).flat();
  const problemsByTask = new Map<string, Set<string>>();
  for (const row of definitions) {
    const problems = readTaskDefinition(row.definition).problems;
    if (!problems) continue;
    problemsByTask.set(row.id, new Set(problems.map((problem) => problem.id)));
    progress.set(row.id, { total: problems.length, passed: 0 });
  }
  if (problemsByTask.size === 0) return progress;
  const results = (
    await Promise.all(
      chunk([...problemsByTask.keys()], D1_MAX_BOUND_PARAMS - 1).map((batch) =>
        db
          .select({
            taskId: taskProblemResults.taskId,
            problemId: taskProblemResults.problemId,
          })
          .from(taskProblemResults)
          .innerJoin(tasks, eq(tasks.id, taskProblemResults.taskId))
          .where(
            and(
              eq(taskProblemResults.userId, userId),
              inArray(taskProblemResults.taskId, batch),
              eq(taskProblemResults.contentHash, tasks.contentHash),
            ),
          ),
      ),
    )
  ).flat();
  for (const result of results) {
    const ids = problemsByTask.get(result.taskId);
    const row = progress.get(result.taskId);
    if (!ids || !row || !ids.has(result.problemId)) continue;
    ids.delete(result.problemId);
    row.passed += 1;
  }
  return progress;
}

/** null は dev-env-basics の初回開始日に戻す。予定の目標日には書き込まない。 */
export function paceProfileUpdate(settings: Partial<PaceSettings>, userId: string) {
  return {
    ...(settings.weeklyHours === undefined ? {} : { weeklyHours: settings.weeklyHours }),
    ...(settings.startDate === undefined
      ? {}
      : {
          learningStartDate:
            settings.startDate ??
            sql`(select date(e.enrolled_at / 1000, 'unixepoch', '+9 hours') from enrollments e join stages s on s.id = e.stage_id where e.user_id = ${userId} and s.slug = 'dev-env-basics' order by e.enrolled_at limit 1)`,
        }),
  };
}

export async function requirePaceLearner(db: Db, caller: Caller, userId: string) {
  const [learner] = await db
    .select({
      id: profiles.id,
      role: profiles.role,
      name: profiles.displayName,
      email: profiles.email,
      disabled: profiles.disabled,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!learner || learner.disabled) throw new ApiError("受講者が見つかりません", 404);
  if (!["student", "admin", "platform_admin"].includes(learner.role))
    throw new ApiError("学習の対象ではありません", 400);
  if (caller.id !== userId && !isStaffRole(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
  return learner as Caller;
}

export async function loadLearningPace(
  db: Db,
  learner: Caller,
  today = toStudyDate(new Date()),
): Promise<LearningPace> {
  const [profile] = await db
    .select({ weeklyHours: profiles.weeklyHours, startDate: profiles.learningStartDate })
    .from(profiles)
    .where(eq(profiles.id, learner.id))
    .limit(1);
  if (!profile) throw new ApiError("プロフィールが見つかりません", 404);
  // 新プログラムだけ。残す旧ステージ・資格の島や補習を1260時間に混ぜない。
  const rows = await db
    .select({
      id: stages.id,
      slug: stages.slug,
      title: stages.title,
      hours: stages.durationHours,
      prerequisites: stages.prerequisites,
    })
    .from(stages)
    .where(
      and(
        eq(stages.status, "published"),
        inArray(stages.slug, [...LEARNING_PROGRAM_SLUGS]),
        eq(stages.audience, "catalog"),
      ),
    );
  const ids = rows.map((s) => s.id);
  const [changes, diagnostics, cleared] = await Promise.all([
    db
      .select({
        date: learningPaceChanges.date,
        weeklyHours: learningPaceChanges.weeklyHours,
        previousWeeklyHours: learningPaceChanges.previousWeeklyHours,
      })
      .from(learningPaceChanges)
      .where(eq(learningPaceChanges.userId, learner.id)),
    db
      .select({ skillId: learningDiagnostics.skillId })
      .from(learningDiagnostics)
      .where(eq(learningDiagnostics.userId, learner.id)),
    loadClearedStageIds(db, learner),
  ]);
  const units: Map<string, PaceUnit & { stageId: string }> = new Map();
  if (ids.length) {
    const unitRows = await db
      .select({
        id: sections.id,
        stageId: sections.stageId,
        title: sections.title,
        hours: contentUnits.plannedHours,
      })
      .from(contentUnits)
      .innerJoin(sections, eq(sections.id, contentUnits.sectionId))
      .where(inArray(sections.stageId, ids))
      .orderBy(asc(sections.order));
    for (const unit of unitRows)
      units.set(unit.id, { ...unit, minutes: unit.hours * 60, lessons: [], tasks: [] });
    const [lessonRows, taskRows] = await Promise.all([
      db
        .select({
          id: lessons.id,
          unitId: lessons.sectionId,
          title: lessons.title,
          duration: lessons.durationLabel,
          completed: lessonProgress.completed,
        })
        .from(lessons)
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .leftJoin(
          lessonProgress,
          and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, learner.id)),
        )
        .where(inArray(sections.stageId, ids))
        .orderBy(asc(lessons.order)),
      db
        .select({
          id: tasks.id,
          unitId: tasks.sectionId,
          title: tasks.title,
          kind: tasks.kind,
          pattern: tasks.pattern,
          skills: tasks.skills,
          minutes: tasks.estimatedMinutes,
          hash: tasks.contentHash,
          progressHash: taskProgress.contentHash,
          status: taskProgress.status,
          passedAt: taskProgress.passedAt,
        })
        .from(tasks)
        .innerJoin(sections, eq(sections.id, tasks.sectionId))
        .leftJoin(
          taskProgress,
          and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, learner.id)),
        )
        // 予備の類題 (#39) はステージの予定に入れない (出題した受講者に復習として出す)。
        .where(and(inArray(sections.stageId, ids), eq(tasks.active, true), isNull(tasks.variantOf)))
        .orderBy(asc(tasks.order)),
    ]);
    const problemProgress = await problemProgressOf(
      db,
      learner.id,
      taskRows.map((task) => task.id),
    );
    for (const lesson of lessonRows) {
      const match = /^(\d+(?:\.\d+)?)分$/.exec(lesson.duration ?? "");
      units.get(lesson.unitId)?.lessons.push({
        id: lesson.id,
        title: lesson.title,
        minutes: match ? Number(match[1]) : 1,
        completed: lesson.completed === true,
      });
    }
    for (const task of taskRows) {
      const problems = problemProgress.get(task.id);
      units.get(task.unitId)?.tasks.push({
        id: task.id,
        title: task.title,
        kind: task.kind as TaskKind,
        pattern: task.pattern,
        skills: task.skills.assesses,
        minutes: task.minutes,
        status: task.hash === task.progressHash ? (task.status ?? "not-started") : "not-started",
        passedDate:
          task.hash === task.progressHash && task.passedAt ? toStudyDate(task.passedAt) : null,
        ...(problems ? { problemsTotal: problems.total, problemsPassed: problems.passed } : {}),
      });
    }
  }
  const program: PaceStage[] = rows.map((stage) => ({
    id: stage.id,
    slug: stage.slug,
    title: stage.title,
    minutes: (stage.hours ?? 0) * 60,
    prerequisites: parsePrerequisites(stage.prerequisites),
    units: [...units.values()].filter((unit) => unit.stageId === stage.id),
    completed: cleared.has(stage.id),
  }));
  const result = calculateLearningPace({
    today,
    settings: profile,
    stages: program,
    changes,
    confirmedSkills: new Set(diagnostics.map((d) => d.skillId)),
  });
  if (rows.some((s) => s.hours === null)) result.incomplete = true;
  return result;
}

/** 計算には全体を使い、名前の配信は既存の霧の境界を守る。 */
export async function visibleLearningPace(db: Db, learner: Caller, pace: LearningPace) {
  const source = await loadSkillMapSource(db, learner);
  const result = evaluateSkillMap(source);
  const visible = new Set([...result.visibility].filter(([, v]) => v === "full").map(([id]) => id));
  return {
    ...pace,
    targets: pace.targets.filter((t) => visible.has(t.stageId)),
    thisWeek: pace.thisWeek.filter((u) => visible.has(u.stageId)),
    assessments: pace.assessments.filter((a) => visible.has(a.stageId)),
  };
}

/** 受講者・宛先・週につき1通。cron の事前の除外と挿入で同じ ID を使う。 */
function paceDelayNotificationId(learnerId: string, recipientId: string, weekStart: string) {
  return `pace:${learnerId}:${recipientId}:${weekStart}`;
}

/** 1 回の cron で計画を計算する受講者の上限。 */
export const PACE_DELAY_LEARNERS_PER_RUN = 20;
const PACE_DELAY_SLOT_MS = 15 * 60_000;

/** 通知 ID を `inArray` で引くときの 1 クエリあたりの件数。type のぶんを上限から引く。 */
const NOTIFICATION_IDS_PER_QUERY = D1_MAX_BOUND_PARAMS - 10;

/**
 * 既存の15分cronで監視。受講者・宛先・週につき1通にして再実行にも耐える。
 *
 * 計算するのは、受講中の登録があり、今週の通知がまだ全宛先にそろっていない受講者だけ。
 * 1 回の起動では `PACE_DELAY_LEARNERS_PER_RUN` 人まで (1人あたり約10クエリ。cron は同じ起動の
 * 他の処理と D1 のクエリ上限を分け合う)。それより多いときは、15分の枠の番号で開始位置をずらして
 * 順に回す。1人の計算は1回で、結果を宛先ごとに入れる。1人が失敗しても後続の受講者は続ける。
 */
export async function notifyPaceDelays(db: Db, today = toStudyDate(new Date()), now = new Date()) {
  const staffIds = await loadActiveStaffIds(db);
  if (staffIds.length === 0) return;
  const weekStart = studyWeekStart(today);
  const learners = await db
    .select({
      id: profiles.id,
      role: profiles.role,
      name: profiles.displayName,
      email: profiles.email,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.role, "student"),
        eq(profiles.disabled, false),
        exists(
          db
            .select({ one: sql`1` })
            .from(enrollments)
            .where(and(eq(enrollments.userId, profiles.id), eq(enrollments.status, "active"))),
        ),
      ),
    )
    .orderBy(asc(profiles.id));
  const idsFor = (learnerId: string) =>
    staffIds.map((staffId) => paceDelayNotificationId(learnerId, staffId, weekStart));
  // 今週の ID を主キーで引くだけ。過去の週の通知は読まない。
  const notified = new Set<string>();
  for (const ids of chunk(
    learners.flatMap((learner) => idsFor(learner.id)),
    NOTIFICATION_IDS_PER_QUERY,
  )) {
    if (ids.length === 0) continue;
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.type, "learning_pace_delayed"), inArray(notifications.id, ids)));
    for (const row of existing) notified.add(row.id);
  }
  const pending = learners.filter((learner) => idsFor(learner.id).some((id) => !notified.has(id)));
  if (pending.length === 0) return;
  // 枠ごとに 1 人ではなく、1 回で計算する人数ぶん進める。1 人ずつだと同じ顔ぶれを計算し続ける。
  const slot = Math.floor(now.getTime() / PACE_DELAY_SLOT_MS);
  const start = (slot * PACE_DELAY_LEARNERS_PER_RUN) % pending.length;
  // 上限以下なら開始位置にかかわらずその回で全員を計算する。上回るときは先頭へ戻して埋めない
  // (戻すと、次の枠が直前の枠と重なる)。
  const batch =
    pending.length <= PACE_DELAY_LEARNERS_PER_RUN
      ? [...pending.slice(start), ...pending.slice(0, start)]
      : pending.slice(start, start + PACE_DELAY_LEARNERS_PER_RUN);
  for (const learner of batch) {
    try {
      const pace = await loadLearningPace(db, learner as Caller, today);
      if (!pace.needsInstructor) continue;
      for (const staffId of staffIds) {
        const id = paceDelayNotificationId(learner.id, staffId, weekStart);
        if (notified.has(id)) continue;
        await db
          .insert(notifications)
          .values({
            id,
            userId: staffId,
            type: "learning_pace_delayed",
            title: `${learner.name}さんの学習ペースを確認してください`,
            body: `進んだ予定時間が目安より${Math.round(-pace.differenceMinutes / 60)}時間少なくなっています。残りの予定は引き直しています。週の時間や支援を相談してください。`,
            payload: { learner_id: learner.id, delay_days: pace.delayDays },
          })
          .onConflictDoNothing({ target: notifications.id });
      }
    } catch (e) {
      console.error("[cron] learning pace notification failed", { learnerId: learner.id }, e);
    }
  }
}
