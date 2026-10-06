import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
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
  learnerInstructors,
  learningDiagnostics,
  learningPaceChanges,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  sections,
  stages,
  tasks,
  taskProgress,
} from "../db/schema.js";
import { ApiError, type Caller } from "./authz.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";
import { loadClearedStageIds, loadSkillMapSource, parsePrerequisites } from "./skill-map-data.js";

/** null は dev-env-basics の初回開始日に戻す。予定の目標日には書き込まない。 */
export function paceProfileUpdate(settings: Partial<PaceSettings>, userId: string) {
  return {
    ...(settings.weeklyHours === undefined ? {} : { weeklyHours: settings.weeklyHours }),
    ...(settings.startDate === undefined
      ? {}
      : {
          learningStartDate:
            settings.startDate ??
            sql`(select date(e.enrolled_at / 1000, 'unixepoch', '+9 hours') from enrollments e join stages s on s.id = e.stage_id join profiles p on p.id = e.user_id where e.user_id = ${userId} and e.tenant_id = p.tenant_id and s.slug = 'dev-env-basics' order by e.enrolled_at limit 1)`,
        }),
  };
}

export async function requirePaceLearner(db: Db, caller: Caller, userId: string) {
  const [learner] = await db
    .select({
      id: profiles.id,
      tenantId: profiles.tenantId,
      role: profiles.role,
      name: profiles.displayName,
      email: profiles.email,
      disabled: profiles.disabled,
    })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.tenantId, caller.tenantId)))
    .limit(1);
  if (!learner || learner.disabled) throw new ApiError("受講者が見つかりません", 404);
  if (!["student", "admin", "platform_admin"].includes(learner.role))
    throw new ApiError("学習の対象ではありません", 400);
  if (caller.id !== userId && caller.role !== "admin" && caller.role !== "platform_admin") {
    if (caller.role !== "instructor") throw new ApiError("権限がありません", 403);
    const [assignment] = await db
      .select({ id: learnerInstructors.learnerId })
      .from(learnerInstructors)
      .where(
        and(
          eq(learnerInstructors.learnerId, userId),
          eq(learnerInstructors.instructorId, caller.id),
        ),
      )
      .limit(1);
    if (!assignment) throw new ApiError("担当する受講者だけを変更できます", 403);
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
  // 新プログラムだけ。残す旧講座・資格の島や補習を1260時間に混ぜない。
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
        eq(stages.tenantId, learner.tenantId),
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
          and(
            eq(lessonProgress.lessonId, lessons.id),
            eq(lessonProgress.userId, learner.id),
            eq(lessonProgress.tenantId, learner.tenantId),
          ),
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
        // 予備の類題 (#39) は講座の予定に入れない (出題した受講者に復習として出す)。
        .where(and(inArray(sections.stageId, ids), eq(tasks.active, true), isNull(tasks.variantOf)))
        .orderBy(asc(tasks.order)),
    ]);
    for (const lesson of lessonRows) {
      const match = /^(\d+(?:\.\d+)?)分$/.exec(lesson.duration ?? "");
      units.get(lesson.unitId)?.lessons.push({
        id: lesson.id,
        title: lesson.title,
        minutes: match ? Number(match[1]) : 1,
        completed: lesson.completed === true,
      });
    }
    for (const task of taskRows)
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
      });
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

/** 受講者・担当講師・週につき1通。cron の事前の除外と挿入で同じ ID を使う。 */
function paceDelayNotificationId(learnerId: string, instructorId: string, weekStart: string) {
  return `pace:${learnerId}:${instructorId}:${weekStart}`;
}

/** 通知 ID を `inArray` で引くときの 1 クエリあたりの件数。type のぶんを上限から引く。 */
const NOTIFICATION_IDS_PER_QUERY = D1_MAX_BOUND_PARAMS - 10;

/**
 * 既存の15分cronで監視。1人・担当・週につき1通にして再実行にも耐える。
 *
 * 今週すでに通知した組は計画を計算し直さない (1人あたり約10クエリ。cron は同じ起動の
 * 他の処理と D1 のクエリ上限を分け合う)。1人の計算・挿入が失敗しても後続の受講者は続ける。
 */
export async function notifyPaceDelays(db: Db, today = toStudyDate(new Date())) {
  const weekStart = studyWeekStart(today);
  const instructor = alias(profiles, "instructor");
  const rows = await db
    .select({
      id: profiles.id,
      tenantId: profiles.tenantId,
      role: profiles.role,
      name: profiles.displayName,
      email: profiles.email,
      instructorId: instructor.id,
    })
    .from(learnerInstructors)
    .innerJoin(profiles, eq(profiles.id, learnerInstructors.learnerId))
    // 担当は同じテナントの有効な講師だけ。受講者ごとに引き直さず 1 クエリで絞る。
    .innerJoin(
      instructor,
      and(
        eq(instructor.id, learnerInstructors.instructorId),
        eq(instructor.tenantId, profiles.tenantId),
        eq(instructor.role, "instructor"),
        eq(instructor.disabled, false),
      ),
    )
    .where(eq(profiles.disabled, false))
    .orderBy(asc(learnerInstructors.learnerId));
  const candidates = rows.map((learner) => ({
    learner,
    id: paceDelayNotificationId(learner.id, learner.instructorId, weekStart),
  }));
  // 今週の ID を主キーで引くだけ。過去の週の通知は読まない。
  const notified = new Set<string>();
  for (const ids of chunk(
    candidates.map((c) => c.id),
    NOTIFICATION_IDS_PER_QUERY,
  )) {
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.type, "learning_pace_delayed"), inArray(notifications.id, ids)));
    for (const row of existing) notified.add(row.id);
  }
  for (const { learner, id } of candidates) {
    if (notified.has(id)) continue;
    try {
      const pace = await loadLearningPace(db, learner as Caller, today);
      if (!pace.needsInstructor) continue;
      await db
        .insert(notifications)
        .values({
          id,
          userId: learner.instructorId,
          tenantId: learner.tenantId,
          type: "learning_pace_delayed",
          title: `${learner.name}さんの学習ペースを確認してください`,
          body: `進んだ予定時間が目安より${Math.round(-pace.differenceMinutes / 60)}時間少なくなっています。残りの予定は引き直しています。週の時間や支援を相談してください。`,
          payload: { learner_id: learner.id, delay_days: pace.delayDays },
        })
        .onConflictDoNothing({ target: notifications.id });
    } catch (e) {
      console.error("[cron] learning pace notification failed", { learnerId: learner.id }, e);
    }
  }
}
