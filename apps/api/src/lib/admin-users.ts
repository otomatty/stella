import { deriveUserStatus } from "@stella/shared/admin/user-status";
import { stageProgressPercent } from "@stella/shared/progress/stage-progress";
import { computeXp } from "@stella/shared/skill-map/xp";
import { addStudyDays, computeStreaks, toStudyDate } from "@stella/shared/study/activity";
import { and, asc, desc, eq, isNull, max, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  authSessions,
  authVscodeLinks,
  groupMembers,
  groups,
  mentorMemos,
  profiles,
  sections,
  submissions,
  taskLocalRuns,
  taskProgress,
  tasks,
} from "../db/schema.js";
import { loadPassedDiscoveryCountsByUser } from "./discovery-data.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";
import { integrationGroupFilter } from "./integrations.js";
import {
  isProblemTaskOverviewLesson,
  loadCompletedProblemSteps,
  loadPassedOverviewLessons,
} from "./lesson-progress-write.js";
import { mentorMemoView } from "./mentor-memo.js";
import { loadPendingHumanReviewsByUser } from "./review-desk.js";
import { loadSkillProfileCountsByUser } from "./skill-map-data.js";
import { skillProfileLevel, skillProfileView, STREAK_LOOKBACK_DAYS } from "./skill-profile.js";
import { loadRecentStumbleConcerns } from "./stumble-alerts.js";
import { stageTaskState, taskCountsByUserStage } from "./task-completion.js";
import { recordedSupportCondition } from "./task-support.js";

type Profile = typeof profiles.$inferSelect;

export function loadAdminUserProfiles(db: Db, groupId?: string) {
  return db
    .select()
    .from(profiles)
    .where(integrationGroupFilter(profiles.id, groupId))
    .orderBy(asc(profiles.createdAt));
}

async function loadUserStudyDays(db: Db, userIds: readonly string[], from: string, today: string) {
  return db.all<{
    userId: string;
    date: string;
    watched_sec: number;
    completed_lessons: number;
  }>(sql`
    select user_id userId, date, watched_sec, completed_lessons
    from study_activity
    where user_id in (select value from json_each(${JSON.stringify(userIds)}))
      and date between ${from} and ${today} and (watched_sec > 0 or completed_lessons > 0)
    order by user_id, date
  `);
}

/** 直近の学習がない人は、最終学習日だけを過去の記録から取得する。 */
async function loadLastStudyDatesBefore(db: Db, userIds: readonly string[], from: string) {
  if (userIds.length === 0) return new Map<string, string | null>();
  const rows = await db.all<{ userId: string; date: string | null }>(sql`
    select ids.value userId, (
      select date from study_activity
      where user_id = ids.value and date < ${from} and (watched_sec > 0 or completed_lessons > 0)
      order by date desc limit 1
    ) date
    from json_each(${JSON.stringify(userIds)}) ids
  `);
  return new Map(rows.map(({ userId, date }) => [userId, date]));
}

async function loadUserStages(
  db: Db,
  userIds: readonly string[],
  problemSteps: Awaited<ReturnType<typeof loadCompletedProblemSteps>>,
) {
  const [rows, taskCounts, passedOverviews] = await Promise.all([
    db.all<{
      userId: string;
      stageId: string;
      title: string;
      enrolledAt: number;
      completedAt: number | null;
      completed: number;
      focused: number;
      lastActivity: number | null;
      lessonsTotal: number;
      lessonsDone: number;
    }>(sql`
      with user_stages as (
        select e.user_id, e.stage_id, e.enrolled_at,
          coalesce(e.completed_at, c.issued_at) completed_at,
          (e.status = 'completed' or c.id is not null) completed
        from enrollments e
        left join certificates c on c.user_id = e.user_id and c.stage_id = e.stage_id and c.revoked = 0
        where e.user_id in (select value from json_each(${JSON.stringify(userIds)}))
          and (e.status in ('active', 'completed') or c.id is not null)
      ), stage_lessons as (
        select l.id, l.problem_id, s.stage_id from sections s
        join lessons l on l.section_id = s.id
        where s.stage_id in (select stage_id from user_stages)
      ), lesson_totals as (
        select stage_id, count(*) total from stage_lessons group by stage_id
      ), lesson_progress_by_stage as (
        select us.user_id, us.stage_id, max(p.updated_at) last_at,
          sum(case when p.completed = 1 and l.problem_id is null
            and not ${isProblemTaskOverviewLesson(sql`l.id`)} then 1 else 0 end) done
        from user_stages us
        join stage_lessons l on l.stage_id = us.stage_id
        join lesson_progress p on p.user_id = us.user_id and p.lesson_id = l.id
        group by us.user_id, us.stage_id
      ), stage_tasks as (
        select t.id, s.stage_id from sections s join tasks t on t.section_id = s.id
        where s.stage_id in (select stage_id from user_stages)
      ), activity as (
        select user_id, stage_id, last_at from lesson_progress_by_stage
        union all
        select us.user_id, us.stage_id, max(r.last_run_at)
        from user_stages us join stage_tasks t on t.stage_id = us.stage_id
        join task_local_runs r on r.user_id = us.user_id and r.task_id = t.id
        group by us.user_id, us.stage_id
        union all
        select us.user_id, us.stage_id, max(p.updated_at)
        from user_stages us join stage_tasks t on t.stage_id = us.stage_id
        join task_problem_results p on p.user_id = us.user_id and p.task_id = t.id
        where p.source <> 'manual'
        group by us.user_id, us.stage_id
        union all
        select us.user_id, us.stage_id, max(p.submitted_at)
        from user_stages us join stage_tasks t on t.stage_id = us.stage_id
        join submissions p on p.student_id = us.user_id and p.task_id = t.id
        where p.review_source is not 'manual'
        group by us.user_id, us.stage_id
        union all
        select us.user_id, us.stage_id, max(r.submitted_at)
        from user_stages us join stage_lessons l on l.stage_id = us.stage_id
        join quizzes q on q.lesson_id = l.id
        join quiz_attempts r on r.user_id = us.user_id and r.quiz_id = q.id
        group by us.user_id, us.stage_id
        union all
        select us.user_id, us.stage_id, max(r.submitted_at)
        from user_stages us join discovery_materials m on m.stage_id = us.stage_id
        join discovery_attempts r on r.user_id = us.user_id and r.material_id = m.id
        group by us.user_id, us.stage_id
        union all
        select us.user_id, us.stage_id, max(o.opened_at)
        from user_stages us join stage_tasks t on t.stage_id = us.stage_id
        join task_help_opens o on o.user_id = us.user_id and o.task_id = t.id
        group by us.user_id, us.stage_id
      ), latest_activity as (
        select user_id, stage_id, max(last_at) last_at from activity group by user_id, stage_id
      )
      select us.user_id userId, us.stage_id stageId, s.title, us.enrolled_at enrolledAt,
        us.completed_at completedAt, us.completed, coalesce(f.active_stage_id = us.stage_id, 0) focused,
        a.last_at lastActivity, coalesce(lt.total, 0) lessonsTotal, coalesce(p.done, 0) lessonsDone
      from user_stages us
      join stages s on s.id = us.stage_id
      left join learner_focus f on f.user_id = us.user_id
      left join lesson_totals lt on lt.stage_id = us.stage_id
      left join lesson_progress_by_stage p on p.user_id = us.user_id and p.stage_id = us.stage_id
      left join latest_activity a on a.user_id = us.user_id and a.stage_id = us.stage_id
      order by us.user_id, us.enrolled_at, us.stage_id
    `),
    taskCountsByUserStage(db, { userIds }),
    loadPassedOverviewLessons(db, userIds),
  ]);
  const key = (userId: string, stageId: string) => JSON.stringify([userId, stageId]);
  const solvedLessons = new Map<string, Set<string>>();
  for (const item of [...problemSteps, ...passedOverviews]) {
    if (item.stageId === null) continue;
    const id = key(item.userId, item.stageId);
    const done = solvedLessons.get(id) ?? new Set<string>();
    done.add(item.lessonId);
    solvedLessons.set(id, done);
  }
  const countsByStage = new Map(taskCounts.map((row) => [key(row.userId, row.stageId), row]));
  return rows.map((row) => {
    const id = key(row.userId, row.stageId);
    const counts = countsByStage.get(id);
    return {
      userId: row.userId,
      focused: row.focused === 1,
      lastActivity: row.lastActivity,
      view: {
        stage_id: row.stageId,
        title: row.title,
        status: row.completed === 1 ? ("completed" as const) : ("in_progress" as const),
        enrolled_at: new Date(row.enrolledAt).toISOString(),
        completed_at:
          row.completed !== 1 || row.completedAt === null
            ? null
            : new Date(row.completedAt).toISOString(),
        progress_percent: stageProgressPercent({
          completed: row.completed === 1,
          lessonsTotal: row.lessonsTotal,
          lessonsDone: row.lessonsDone + (solvedLessons.get(id)?.size ?? 0),
          tasksTotal: counts?.total ?? 0,
          tasksPassed: counts?.passed ?? 0,
        }),
      },
    };
  });
}

function groupByUser<T extends { userId: string }>(rows: readonly T[]) {
  const byUser = new Map<string, T[]>();
  for (const row of rows) {
    const group = byUser.get(row.userId) ?? [];
    group.push(row);
    byUser.set(row.userId, group);
  }
  return byUser;
}

async function loadUserSummaries(db: Db, users: readonly Profile[], now: Date) {
  const userIds = users.map((user) => user.id);
  const today = toStudyDate(now);
  const streakFrom = addStudyDays(today, 1 - STREAK_LOOKBACK_DAYS);
  const from28 = addStudyDays(today, -27);
  const from84 = addStudyDays(today, -83);
  const steps = loadCompletedProblemSteps(db, userIds);
  const [counts, discoveries, stages, study, reviews, concerns] = await Promise.all([
    // ステージ進捗と XP で、同じ問題結果を 1 回だけ読み出す。
    steps.then((rows) => loadSkillProfileCountsByUser(db, userIds, rows)),
    loadPassedDiscoveryCountsByUser(db, userIds),
    steps.then((rows) => loadUserStages(db, userIds, rows)),
    loadUserStudyDays(db, userIds, streakFrom, today),
    loadPendingHumanReviewsByUser(db, userIds),
    loadRecentStumbleConcerns(db, userIds, now),
  ]);
  const stagesByUser = groupByUser(stages);
  const studyByUser = groupByUser(study);
  const concernsByUser = groupByUser(concerns);
  const olderLastStudyDates = await loadLastStudyDatesBefore(
    db,
    userIds.filter((id) => !studyByUser.has(id)),
    streakFrom,
  );
  return users.map((user) => {
    const xp = computeXp({
      completedLessons: 0,
      clearedStages: 0,
      passedQuizzes: 0,
      ...counts.get(user.id),
      passedDiscoveries: discoveries.get(user.id) ?? 0,
    });
    const { next_level_at: _nextLevelAt, ...level } = skillProfileLevel(xp);
    const userStages = stagesByUser.get(user.id) ?? [];
    const inProgress = userStages.filter((stage) => stage.view.status === "in_progress");
    // 受講登録は登録日時の昇順。活動がまだなければ最後に登録した受講中のステージを使う。
    const current =
      inProgress.find((stage) => stage.focused) ??
      inProgress.reduce<(typeof inProgress)[number] | undefined>((latest, stage) => {
        if (stage.lastActivity === null) return latest;
        return latest?.lastActivity != null && latest.lastActivity >= stage.lastActivity
          ? latest
          : stage;
      }, undefined) ??
      inProgress.at(-1);
    const studyDays = (studyByUser.get(user.id) ?? []).map(({ userId: _userId, ...day }) => day);
    const streak = computeStreaks(studyDays, today);
    const recentConcerns = (concernsByUser.get(user.id) ?? []).map(
      ({ userId: _userId, ...row }) => row,
    );
    const lastStudyDate = studyDays.at(-1)?.date ?? olderLastStudyDates.get(user.id) ?? null;
    const pendingReviews = reviews.get(user.id) ?? 0;
    const stumbleSignals = recentConcerns.map((row) => row.signal);
    const status = deriveUserStatus({
      role: user.role,
      today,
      registeredDate: toStudyDate(user.createdAt),
      lastStudyDate,
      hasActiveEnrollment: inProgress.length > 0,
      level: level.level,
      stumbleSignals,
      pendingReviews,
    });
    const days = studyDays.filter((day) => day.date >= from28);
    return {
      card: {
        user_id: user.id,
        level: { ...level, xp_total: xp.total },
        current_stage: current
          ? {
              stage_id: current.view.stage_id,
              title: current.view.title,
              progress_percent: current.view.progress_percent,
            }
          : null,
        days,
        last_study_date: lastStudyDate,
        streak_current: streak.current,
        pending_reviews: pendingReviews,
        stumble_signals: stumbleSignals,
        status,
      },
      level: skillProfileView(xp, { ...streak, today }, now),
      streak,
      activeDays84: studyDays.filter((day) => day.date >= from84).length,
      stages: userStages.map((stage) => stage.view),
      concerns: recentConcerns,
    };
  });
}

export async function loadAdminUserOverview(db: Db, users: Profile[], now = new Date()) {
  const rows = [];
  for (const part of chunk(users, D1_MAX_BOUND_PARAMS - 10)) {
    rows.push(...(await loadUserSummaries(db, part, now)).map((row) => row.card));
  }
  return { rows };
}

async function loadCurrentStageTasks(db: Db, userId: string, stageId: string) {
  // 現在の合格の版にそろえ、その版で最初に合格した提出の時点で判定する。
  const pass = db
    .select({
      assisted: sql<boolean>`case when
        (case when json_valid(${submissions.supportLog})
          then json_array_length(${submissions.supportLog}) > 0 end)
        or ${submissions.submissionMode} = 'consult'
        or ${recordedSupportCondition(db, {
          userId,
          taskId: sql`${submissions.taskId}`,
          submittedAt: sql`${submissions.submittedAt}`,
        })}
        then 1 else 0 end`,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, userId),
        eq(submissions.taskId, tasks.id),
        eq(submissions.taskContentHash, taskProgress.contentHash),
        eq(submissions.verdict, "pass"),
      ),
    )
    .orderBy(asc(submissions.submittedAt), asc(submissions.id))
    .limit(1);

  const rows = await db
    .select({
      task_id: tasks.id,
      title: tasks.title,
      unit_title: sections.title,
      hash: tasks.contentHash,
      progress: { status: taskProgress.status, contentHash: taskProgress.contentHash },
      assisted: sql<boolean>`coalesce((${pass}), 0)`.mapWith(Boolean),
      local_failure_streak: sql<number>`coalesce(${taskLocalRuns.failureStreak}, 0)`,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .leftJoin(taskProgress, and(eq(taskProgress.userId, userId), eq(taskProgress.taskId, tasks.id)))
    .leftJoin(
      taskLocalRuns,
      and(eq(taskLocalRuns.userId, userId), eq(taskLocalRuns.taskId, tasks.id)),
    )
    .where(and(eq(sections.stageId, stageId), eq(tasks.active, true), isNull(tasks.variantOf)))
    .orderBy(asc(sections.order), asc(tasks.order));
  return rows.map(({ hash, progress, assisted, ...task }) => {
    const state = stageTaskState(hash, progress);
    return { ...task, state, assisted: (state === "passed" || state === "ai-passed") && assisted };
  });
}

export async function loadAdminUserDetail(db: Db, user: Profile, now = new Date()) {
  const [[summary], memberships, [vscode], [login], [memo]] = await Promise.all([
    loadUserSummaries(db, [user], now),
    db
      .select({ id: groups.id, name: groups.name })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.profileId, user.id))
      .orderBy(asc(groups.name), asc(groups.id)),
    db
      .select({ date: max(authVscodeLinks.usedAt) })
      .from(authVscodeLinks)
      .where(eq(authVscodeLinks.userId, user.id)),
    db
      .select({ date: max(authSessions.createdAt) })
      .from(authSessions)
      .where(eq(authSessions.userId, user.id)),
    db
      .select()
      .from(mentorMemos)
      .where(eq(mentorMemos.learnerId, user.id))
      .orderBy(desc(mentorMemos.weekStart))
      .limit(1),
  ]);
  if (!summary) throw new Error("Missing user summary");
  const currentStageId = summary.card.current_stage?.stage_id ?? null;
  return {
    profile: {
      id: user.id,
      display_name: user.displayName,
      email: user.email,
      role: user.role,
      disabled: user.disabled,
      created_at: user.createdAt.toISOString(),
      groups: memberships,
      vscode_connected_at: vscode?.date?.toISOString() ?? null,
      last_login_at: login?.date?.toISOString() ?? null,
    },
    level: summary.level,
    streak: summary.streak,
    active_days_28: summary.card.days.length,
    active_days_84: summary.activeDays84,
    stages: summary.stages,
    current_stage: currentStageId,
    current_stage_tasks:
      currentStageId === null ? [] : await loadCurrentStageTasks(db, user.id, currentStageId),
    concerns: summary.concerns,
    mentor_memo: memo ? mentorMemoView(memo, user.displayName) : null,
    status: summary.card.status,
  };
}
