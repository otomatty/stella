import { isGroupReactionEmoji } from "@stella/shared/groups/reactions";
import type { GroupPeerProgress, LearnerGroup } from "@stella/shared/groups/types";
import { stageProgressPercent } from "@stella/shared/progress/stage-progress";
import { parentSlugOf, type SkillMapStage } from "@stella/shared/skill-map/evaluate";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "../lib/enrollment-bulk.js";
import {
  loadGroupTimeline,
  peerStageVisible,
  readTimelineCursor,
  requireTimelineGroup,
  revokeTimelineReflection,
  updateTimelineReaction,
} from "../lib/group-timeline.js";
import { learnerOnly } from "../lib/learner-scope.js";
import {
  isProblemTaskOverviewLesson,
  loadCompletedProblemSteps,
  problemTaskOverviewTasks,
} from "../lib/lesson-progress-write.js";
import { loadSkillMapSource } from "../lib/skill-map-data.js";
import { evaluateSkillMapFor } from "./skill-map.js";

export const groupsRoute = new Hono<{ Bindings: Env }>();
groupsRoute.onError((err, c) => errorResponse(c, err));
groupsRoute.use("/api/groups/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

groupsRoute.get("/api/groups/mine", async (c) => {
  const { caller, db } = await getCaller(c);
  if (caller.role !== "student") throw new ApiError("権限がありません", 403);
  const rows = await db.all<
    Omit<LearnerGroup, "shareProgress" | "shareActivity"> & {
      shareProgress: 0 | 1;
      shareActivity: 0 | 1;
    }
  >(sql`
    select g.id, g.name, count(p.id) memberCount,
      g.share_progress shareProgress, g.share_activity shareActivity
    from group_members mine
    join groups g on g.id = mine.group_id
    join group_members m on m.group_id = g.id
    join profiles p on p.id = m.profile_id
    where mine.profile_id = ${caller.id} and (g.share_progress = 1 or g.share_activity = 1)
      and p.disabled = 0 and ${learnerOnly(sql`p.id`)}
    group by g.id
    order by g.name, g.id
  `);
  return c.json({
    groups: rows.map(
      (row): LearnerGroup => ({
        ...row,
        shareProgress: row.shareProgress === 1,
        shareActivity: row.shareActivity === 1,
      }),
    ),
  });
});

interface PeerProgressRow {
  groupId: string;
  groupName: string;
  profileId: string;
  peerName: string;
  stageId: string | null;
  lessonsTotal: number;
  lessonsDone: number;
  tasksTotal: number;
  tasksPassed: number;
  cleared: 0 | 1;
  enrolled: 0 | 1;
}

interface StageActivity {
  percent: number;
  cleared: boolean;
  started: boolean;
}

/** 見えるステージを、親が先・同じ段は題名順に並べる。 */
function orderVisibleStages(stages: SkillMapStage[]): { id: string; title: string }[] {
  const bySlug = new Map(stages.map((stage) => [stage.slug, stage]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (stage: SkillMapStage): number => {
    const known = depth.get(stage.id);
    if (known !== undefined) return known;
    if (visiting.has(stage.id)) return 0;
    visiting.add(stage.id);
    const parentSlug = parentSlugOf(stage);
    const parent = parentSlug === undefined ? undefined : bySlug.get(parentSlug);
    const value = parent ? depthOf(parent) + 1 : 0;
    visiting.delete(stage.id);
    depth.set(stage.id, value);
    return value;
  };
  for (const stage of stages) depthOf(stage);
  return [...stages]
    .sort((a, b) => {
      const byDepth = (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0);
      if (byDepth !== 0) return byDepth;
      const byTitle = a.title.localeCompare(b.title, "ja");
      if (byTitle !== 0) return byTitle;
      return a.id.localeCompare(b.id);
    })
    .map((stage) => ({ id: stage.id, title: stage.title }));
}

/** 問題のレッスンは提出が正本。所属と公開ステージの範囲は呼び出し側の行に残っている。 */
async function addCompletedProblemLessons(db: Db, rows: PeerProgressRow[]): Promise<void> {
  const peerIds = [...new Set(rows.map((row) => row.profileId))];
  const stageIds = [...new Set(rows.flatMap((row) => (row.stageId === null ? [] : [row.stageId])))];
  if (peerIds.length === 0 || stageIds.length === 0) return;
  const problemLessons = await db.all<{ lessonId: string; stageId: string }>(sql`
    select l.id lessonId, u.stage_id stageId
    from sections u
    join lessons l on l.section_id = u.id
    where l.problem_id is not null
      and u.stage_id in (select value from json_each(${JSON.stringify(stageIds)}))
  `);
  if (problemLessons.length === 0) return;
  const stageByLesson = new Map(problemLessons.map((lesson) => [lesson.lessonId, lesson.stageId]));
  const lessonIds = [...stageByLesson.keys()];
  const done = new Map<string, Set<string>>();
  for (const ids of chunk(peerIds, D1_MAX_BOUND_PARAMS - 10)) {
    for (const step of await loadCompletedProblemSteps(db, ids, lessonIds)) {
      const stageId = stageByLesson.get(step.lessonId);
      if (!stageId) continue;
      const key = `${step.userId}\0${stageId}`;
      const lessons = done.get(key) ?? new Set<string>();
      lessons.add(step.lessonId);
      done.set(key, lessons);
    }
  }
  for (const row of rows) {
    if (row.stageId === null) continue;
    row.lessonsDone += done.get(`${row.profileId}\0${row.stageId}`)?.size ?? 0;
  }
}

function buildPeerProgress(
  rows: PeerProgressRow[],
  callerId: string,
  visible: { id: string; title: string }[],
  hiddenIds: ReadonlySet<string>,
): GroupPeerProgress {
  const first = rows[0];
  if (!first) throw new ApiError("Not found", 404);
  const members = new Map<
    string,
    { name: string; isMe: boolean; activity: Map<string, StageActivity> }
  >();
  for (const row of rows) {
    let member = members.get(row.profileId);
    if (!member) {
      member = {
        name: row.peerName,
        isMe: row.profileId === callerId,
        activity: new Map(),
      };
      members.set(row.profileId, member);
    }
    if (row.stageId === null) continue;
    const cleared = row.cleared === 1;
    member.activity.set(row.stageId, {
      percent: stageProgressPercent({ ...row, completed: cleared }),
      cleared,
      started: row.enrolled === 1 || row.lessonsDone > 0 || row.tasksPassed > 0,
    });
  }
  return {
    group: { id: first.groupId, name: first.groupName },
    hasHiddenStages: hiddenIds.size > 0,
    stages: visible,
    members: [...members.values()].map((member) => ({
      name: member.name,
      isMe: member.isMe,
      ahead: !member.isMe && [...hiddenIds].some((id) => member.activity.get(id)?.started === true),
      stages: visible.map((stage) => {
        const activity = member.activity.get(stage.id);
        return {
          id: stage.id,
          percent: activity?.percent ?? 0,
          cleared: activity?.cleared ?? false,
        };
      }),
    })),
  };
}

groupsRoute.get("/api/groups/:id/peers", async (c) => {
  const { caller, db } = await getCaller(c);
  if (caller.role !== "student") throw new ApiError("権限がありません", 403);

  // 公開・所属の確認と進捗の読み取りを同じ文にまとめる。
  // CMS のステージ詳細と同じく、対象セクション内の全レッスンを数える。
  // 課題は taskCountsForUser と同じ有効な通常課題・合格状態を数える。
  const rows = await db.all<PeerProgressRow>(sql`
    with shared_group as (
      select g.id, g.name from groups g
      join group_members mine on mine.group_id = g.id
      where g.id = ${c.req.param("id")} and g.share_progress = 1 and mine.profile_id = ${caller.id}
    ), peers as (
      select p.id, coalesce(m.peer_name, p.display_name) name
      from shared_group g
      join group_members m on m.group_id = g.id
      join profiles p on p.id = m.profile_id
      where p.disabled = 0 and ${learnerOnly(sql`p.id`)}
      order by name, p.id
      limit 200
    ), published_stages as (
      select s.id from shared_group g
      join group_stages gs on gs.group_id = g.id
      join stages s on s.id = gs.stage_id
      where s.status = 'published'
    ), stage_lessons as (
      select l.id, u.stage_id from published_stages s
      join sections u on u.stage_id = s.id
      join lessons l on l.section_id = u.id
    ), stage_tasks as (
      select t.id, u.stage_id from published_stages s
      join sections u on u.stage_id = s.id
      join tasks t on t.section_id = u.id
      where t.active = 1 and t.variant_of is null
    ), lesson_totals as (
      select stage_id, count(*) total from stage_lessons group by stage_id
    ), task_totals as (
      select stage_id, count(*) total from stage_tasks group by stage_id
    ), completed_lessons as (
      select p.id profile_id, l.stage_id, l.id lesson_id from peers p
      join lesson_progress lp on lp.user_id = p.id and lp.completed = 1
      join stage_lessons l on l.id = lp.lesson_id
      join lessons lesson on lesson.id = l.id and lesson.problem_id is null
      where not ${isProblemTaskOverviewLesson(sql`l.id`)}
      union
      select p.id, l.stage_id, l.id from peers p
      join task_progress tp on tp.user_id = p.id and tp.status in ('passed', 'ai-passed')
      join (${problemTaskOverviewTasks}) t on t.id = tp.task_id
      join stage_lessons l on l.id = t.lesson_id
    ), lesson_counts as (
      select profile_id, stage_id, count(*) done from completed_lessons
      group by profile_id, stage_id
    ), task_counts as (
      select p.id profile_id, t.stage_id, count(*) passed from peers p
      join task_progress tp on tp.user_id = p.id and tp.status in ('passed', 'ai-passed')
      join stage_tasks t on t.id = tp.task_id
      group by p.id, t.stage_id
    )
    select g.id groupId, g.name groupName, p.id profileId, p.name peerName,
      s.id stageId,
      coalesce(lt.total, 0) lessonsTotal, coalesce(lc.done, 0) lessonsDone,
      coalesce(tt.total, 0) tasksTotal, coalesce(tc.passed, 0) tasksPassed,
      e.completed_at is not null cleared,
      e.id is not null enrolled
    from shared_group g cross join peers p
    left join published_stages s on true
    left join lesson_totals lt on lt.stage_id = s.id
    left join task_totals tt on tt.stage_id = s.id
    left join lesson_counts lc on lc.stage_id = s.id and lc.profile_id = p.id
    left join task_counts tc on tc.stage_id = s.id and tc.profile_id = p.id
    left join enrollments e on e.stage_id = s.id and e.user_id = p.id
    order by p.name, p.id, s.id
  `);
  const first = rows[0];
  if (!first) throw new ApiError("Not found", 404);
  await addCompletedProblemLessons(db, rows);

  const publishedIds = new Set(rows.flatMap((row) => (row.stageId === null ? [] : [row.stageId])));
  const source = await loadSkillMapSource(db, caller);
  const evaluated = evaluateSkillMapFor(source);
  const byId = new Map(source.stages.map((stage) => [stage.id, stage]));
  const visibleStages = [...publishedIds].flatMap((id) => {
    const stage = byId.get(id);
    return stage !== undefined && peerStageVisible(stage, evaluated) ? [stage] : [];
  });
  const visible = orderVisibleStages(visibleStages);
  const visibleIds = new Set(visible.map((stage) => stage.id));
  const hiddenIds = new Set([...publishedIds].filter((id) => !visibleIds.has(id)));
  return c.json(buildPeerProgress(rows, caller.id, visible, hiddenIds) satisfies GroupPeerProgress);
});

groupsRoute.get("/api/groups/:id/timeline", async (c) => {
  const { caller, db } = await getCaller(c);
  if (caller.role !== "student") throw new ApiError("権限がありません", 403);
  const group = await requireTimelineGroup(db, c.req.param("id"), caller.id);
  return c.json(
    await loadGroupTimeline(db, caller, group, readTimelineCursor(c.req.query("cursor"))),
  );
});

groupsRoute.on(["POST", "DELETE"], "/api/groups/:id/timeline/reactions", async (c) => {
  const { caller, db } = await getCaller(c);
  if (caller.role !== "student") throw new ApiError("権限がありません", 403);
  const group = await requireTimelineGroup(db, c.req.param("id"), caller.id);
  const remove = c.req.method === "DELETE";
  const query = c.req.query();
  const input: unknown =
    remove && ("key" in query || "emoji" in query) ? query : await c.req.json().catch(() => null);
  if (
    typeof input !== "object" ||
    input === null ||
    !("emoji" in input) ||
    !isGroupReactionEmoji(input.emoji)
  )
    throw new ApiError("絵文字を一覧から選んでください", 400);
  if (!("key" in input) || typeof input.key !== "string") throw new ApiError("Not found", 404);
  const reactions = await updateTimelineReaction(
    db,
    caller,
    group.id,
    input.key,
    input.emoji,
    remove,
  );
  return c.json({ reactions });
});

groupsRoute.delete("/api/groups/:id/timeline/reflection", async (c) => {
  const { caller, db } = await getCaller(c);
  if (caller.role !== "student") throw new ApiError("権限がありません", 403);
  const group = await requireTimelineGroup(db, c.req.param("id"), caller.id);
  const query = c.req.query();
  const input: unknown = "key" in query ? query : await c.req.json().catch(() => null);
  if (
    typeof input !== "object" ||
    input === null ||
    !("key" in input) ||
    typeof input.key !== "string"
  )
    throw new ApiError("Not found", 404);

  await revokeTimelineReflection(db, caller, group.id, input.key);
  return c.json({ ok: true });
});
