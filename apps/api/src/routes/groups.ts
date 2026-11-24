import { stageProgressPercent } from "@stella/shared/progress/stage-progress";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import { learnerOnly } from "../lib/learner-scope.js";

export const groupsRoute = new Hono<{ Bindings: Env }>();
groupsRoute.onError((err, c) => errorResponse(c, err));
groupsRoute.use("/api/groups/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

groupsRoute.get("/api/groups/mine", async (c) => {
  const { caller, db } = await getCaller(c);
  if (caller.role !== "student") throw new ApiError("権限がありません", 403);
  const groups = await db.all<{ id: string; name: string; memberCount: number }>(sql`
    select g.id, g.name, count(p.id) memberCount
    from group_members mine
    join groups g on g.id = mine.group_id
    join group_members m on m.group_id = g.id
    join profiles p on p.id = m.profile_id
    where mine.profile_id = ${caller.id} and g.share_progress = 1
      and p.disabled = 0 and ${learnerOnly(sql`p.id`)}
    group by g.id
    order by g.name, g.id
  `);
  return c.json({ groups });
});

interface PeerProgressRow {
  groupId: string;
  groupName: string;
  profileId: string;
  peerName: string;
  stageId: string | null;
  stageTitle: string | null;
  lessonsTotal: number;
  lessonsDone: number;
  tasksTotal: number;
  tasksPassed: number;
  cleared: 0 | 1;
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
      select s.id, s.title from shared_group g
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
    ), lesson_counts as (
      select p.id profile_id, l.stage_id, count(*) done from peers p
      join lesson_progress lp on lp.user_id = p.id and lp.completed = 1
      join stage_lessons l on l.id = lp.lesson_id
      group by p.id, l.stage_id
    ), task_counts as (
      select p.id profile_id, t.stage_id, count(*) passed from peers p
      join task_progress tp on tp.user_id = p.id and tp.status in ('passed', 'ai-passed')
      join stage_tasks t on t.id = tp.task_id
      group by p.id, t.stage_id
    )
    select g.id groupId, g.name groupName, p.id profileId, p.name peerName,
      s.id stageId, s.title stageTitle,
      coalesce(lt.total, 0) lessonsTotal, coalesce(lc.done, 0) lessonsDone,
      coalesce(tt.total, 0) tasksTotal, coalesce(tc.passed, 0) tasksPassed,
      e.completed_at is not null cleared
    from shared_group g cross join peers p
    left join published_stages s on true
    left join lesson_totals lt on lt.stage_id = s.id
    left join task_totals tt on tt.stage_id = s.id
    left join lesson_counts lc on lc.stage_id = s.id and lc.profile_id = p.id
    left join task_counts tc on tc.stage_id = s.id and tc.profile_id = p.id
    left join enrollments e on e.stage_id = s.id and e.user_id = p.id
    order by p.name, p.id, s.title, s.id
  `);
  const first = rows[0];
  if (!first) throw new ApiError("Not found", 404);

  const stages = new Map<string, { id: string; title: string }>();
  const members = new Map<
    string,
    { name: string; isMe: boolean; stages: { id: string; percent: number; cleared: boolean }[] }
  >();
  for (const row of rows) {
    let member = members.get(row.profileId);
    if (!member) {
      member = { name: row.peerName, isMe: row.profileId === caller.id, stages: [] };
      members.set(row.profileId, member);
    }
    if (row.stageId === null || row.stageTitle === null) continue;
    stages.set(row.stageId, { id: row.stageId, title: row.stageTitle });
    const cleared = row.cleared === 1;
    member.stages.push({
      id: row.stageId,
      percent: stageProgressPercent({ ...row, completed: cleared }),
      cleared,
    });
  }
  return c.json({
    group: { id: first.groupId, name: first.groupName },
    stages: [...stages.values()],
    members: [...members.values()],
  });
});
