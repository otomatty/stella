import { MAX_REACTIONS_PER_EVENT_PER_USER } from "@stella/shared/groups/reactions";
import type { GroupTimeline, GroupTimelineEvent } from "@stella/shared/groups/types";
import { isRevealOneAtATimeIsland, type SkillMapStage } from "@stella/shared/skill-map/evaluate";
import { STUDY_TZ_OFFSET_MIN, toStudyDate } from "@stella/shared/study/activity";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { evaluateSkillMapFor } from "../routes/skill-map.js";
import { ApiError, type Caller } from "./authz.js";
import { hasReflectionText } from "./group-reflections.js";
import { learnerOnly } from "./learner-scope.js";
import { loadSkillMapSource } from "./skill-map-data.js";
import { hasOnlyManualTaskPass } from "./task-pass-source.js";

const PAGE_SIZE = 30;
type TimelineGroup = GroupTimeline["group"];
type Reaction = GroupTimelineEvent["reactions"][number];

interface EventIdentity {
  kind: GroupTimelineEvent["kind"];
  ref: string;
  profileId: string;
}

interface EventRow extends EventIdentity {
  at: number;
  name: string;
  stageId: string | null;
  stageTitle: string | null;
  taskTitle: string | null;
  reflection: string | null;
}

interface Cursor {
  at: number;
  count: number;
}

export function readTimelineCursor(value: string | undefined): Cursor | null {
  if (value === undefined) return null;
  try {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw new Error();
    const raw: unknown = JSON.parse(atob(value.replaceAll("-", "+").replaceAll("_", "/")));
    if (
      typeof raw === "object" &&
      raw !== null &&
      "at" in raw &&
      typeof raw.at === "number" &&
      Number.isSafeInteger(raw.at) &&
      "count" in raw &&
      typeof raw.count === "number" &&
      Number.isSafeInteger(raw.count) &&
      raw.count > 0
    ) {
      return { at: raw.at, count: raw.count };
    }
    throw new Error();
  } catch {
    throw new ApiError("カーソルが不正です", 400);
  }
}

function encodeCursor(cursor: Cursor): string {
  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function requireTimelineGroup(db: Db, groupId: string, viewerId: string) {
  const [group] = await db.all<TimelineGroup>(sql`
    select g.id, g.name from groups g
    join group_members mine on mine.group_id = g.id
    where g.id = ${groupId} and g.share_activity = 1 and mine.profile_id = ${viewerId}
  `);
  if (!group) throw new ApiError("Not found", 404);
  return group;
}

/** 修了・受講中・始められる星だけ。段階表示の島はスキルツリーの full に合わせる。 */
export function peerStageVisible(
  stage: SkillMapStage,
  evaluated: ReturnType<typeof evaluateSkillMapFor>,
): boolean {
  const state = evaluated.states.get(stage.id);
  if (state !== "cleared" && state !== "active" && state !== "unlocked") return false;
  if (isRevealOneAtATimeIsland(stage.category)) {
    return evaluated.visibility.get(stage.id) === "full";
  }
  return true;
}

async function visibleStageIds(db: Db, viewer: Caller) {
  const source = await loadSkillMapSource(db, viewer);
  const evaluated = evaluateSkillMapFor(source);
  return source.stages
    .filter((stage) => peerStageVisible(stage, evaluated))
    .map((stage) => stage.id);
}

function timelineEvents(
  groupId: string,
  viewerId: string,
  visibleIds: string[],
  targetId?: string,
) {
  // 過去を切り捨てずにページ化するため、非公開の節目の集約も DB で行う。
  return sql`
    with shared_group as (
      select g.id from groups g
      join group_members mine on mine.group_id = g.id
      join profiles viewer on viewer.id = mine.profile_id
      where g.id = ${groupId} and g.share_activity = 1 and mine.profile_id = ${viewerId}
        and viewer.disabled = 0 and ${learnerOnly(sql`viewer.id`)}
    ), members as (
      select p.id, coalesce(m.peer_name, p.display_name) name, m.joined_at
      from shared_group g
      join group_members m on m.group_id = g.id
      join profiles p on p.id = m.profile_id
      where p.disabled = 0 and p.hide_group_activity = 0 and ${learnerOnly(sql`p.id`)}
        ${targetId === undefined ? sql`` : sql`and p.id = ${targetId}`}
    ), published_stages as (
      select s.id, s.title, s.id in (select value from json_each(${JSON.stringify(visibleIds)})) visible
      from shared_group g
      join group_stages gs on gs.group_id = g.id
      join stages s on s.id = gs.stage_id and s.status = 'published'
    ), enrolled as (
      select m.id profileId, m.joined_at, e.stage_id stageId, s.title stageTitle, s.visible,
        e.enrolled_at, e.completed_at
      from members m
      join enrollments e on e.user_id = m.id
      join published_stages s on s.id = e.stage_id
    ), milestones(kind, ref, profileId, at, stageId, stageTitle, taskTitle, visible) as (
      select 'stage_start', stageId, profileId, enrolled_at, stageId, stageTitle, null, visible
      from enrolled where enrolled_at >= joined_at
      union all
      select 'stage_clear', stageId, profileId, completed_at, stageId, stageTitle, null, visible
      from enrolled where completed_at >= joined_at
      union all
      select 'task_pass', t.id, m.id, tp.passed_at, s.id, s.title, t.title, s.visible
      from members m
      join task_progress tp on tp.user_id = m.id
      join tasks t on t.id = tp.task_id and t.active = 1 and t.variant_of is null
      join sections u on u.id = t.section_id
      join published_stages s on s.id = u.stage_id
      where tp.status in ('passed', 'ai-passed') and tp.passed_at >= m.joined_at
        and not ${hasOnlyManualTaskPass(sql`tp.user_id`, sql`tp.task_id`)}
    ), visible_events(kind, ref, profileId, at, stageId, stageTitle, taskTitle) as (
      select kind, ref, profileId, at, stageId, stageTitle, taskTitle
      from milestones where visible
      union all
      select 'ahead', date(at / 1000.0 + ${STUDY_TZ_OFFSET_MIN * 60}, 'unixepoch') day, profileId,
        max(at), null, null, null
      from milestones where not visible and profileId <> ${viewerId}
      group by profileId, day
    )
  `;
}

async function memberHandle(groupId: string, profileId: string): Promise<string> {
  const input = new TextEncoder().encode(`${groupId}\0${profileId}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input), 0, 12);
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function eventIdentity({ kind, ref, profileId }: EventIdentity) {
  return [kind, profileId, ref] as const;
}

async function eventReactions(db: Db, groupId: string, viewerId: string, events: EventIdentity[]) {
  const summaries = new Map<string, Map<string, Reaction>>();
  if (events.length === 0) return summaries;
  const rows = await db.all<EventIdentity & { emoji: string; name: string; fromId: string }>(sql`
    select r.kind, r.ref, r.target_profile_id profileId, r.emoji, r.from_profile_id fromId,
      coalesce(m.peer_name, p.display_name) name
    from json_each(${JSON.stringify(events.map(eventIdentity))}) requested
    join group_activity_reactions r on r.group_id = ${groupId}
      and r.kind = json_extract(requested.value, '$[0]')
      and r.target_profile_id = json_extract(requested.value, '$[1]')
      and r.ref = json_extract(requested.value, '$[2]')
    join group_members m on m.group_id = r.group_id and m.profile_id = r.from_profile_id
    join profiles p on p.id = m.profile_id and p.disabled = 0
    where ${learnerOnly(sql`p.id`)}
    order by r.created_at, r.rowid
  `);
  for (const row of rows) {
    const identity = JSON.stringify(eventIdentity(row));
    const byEmoji = summaries.get(identity) ?? new Map<string, Reaction>();
    summaries.set(identity, byEmoji);
    const reaction = byEmoji.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      names: [],
      mine: false,
    };
    byEmoji.set(row.emoji, reaction);
    reaction.count++;
    reaction.names.push(row.name);
    reaction.mine ||= row.fromId === viewerId;
  }
  return summaries;
}

export async function loadGroupTimeline(
  db: Db,
  viewer: Caller,
  group: TimelineGroup,
  cursor: Cursor | null,
): Promise<GroupTimeline> {
  const ids = await visibleStageIds(db, viewer);
  const rows = await db.all<EventRow>(sql`
    ${timelineEvents(group.id, viewer.id, ids)}
    , page as (
      select e.*, m.name from visible_events e
      join members m on m.id = e.profileId
      ${cursor ? sql`where at <= ${cursor.at}` : sql``}
      order by at desc, kind, ref, profileId
      limit ${PAGE_SIZE + 1} offset ${cursor?.count ?? 0}
    )
    select e.*, case when e.kind = 'task_pass' then (
      select x.explanation from tasks t
      join submissions x on x.task_id = t.id and x.student_id = e.profileId
      where t.id = e.ref and x.share_reflection = 1 and x.reflection_hidden_at is null
        and ${hasReflectionText(sql`x.explanation`)}
        and case when json_valid(t.definition)
          then coalesce(json_array_length(t.definition, '$.problems'), 0) = 0 else 0 end
      order by x.submitted_at desc, x.attempt desc, x.id desc limit 1
    ) end reflection
    from page e order by at desc, kind, ref, profileId
  `);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  const nextCursor =
    rows.length > PAGE_SIZE && last
      ? encodeCursor({
          at: last.at,
          count:
            (cursor?.at === last.at ? cursor.count : 0) +
            page.filter((row) => row.at === last.at).length,
        })
      : null;

  const reactions = await eventReactions(db, group.id, viewer.id, page);
  const handles = new Map(
    await Promise.all(
      [...new Set(page.map((row) => row.profileId))].map(
        async (id) => [id, await memberHandle(group.id, id)] as const,
      ),
    ),
  );
  const events: GroupTimelineEvent[] = page.map((row) => ({
    key: `${row.kind}:${handles.get(row.profileId)}:${row.ref}`,
    kind: row.kind,
    date: toStudyDate(row.at),
    member: { name: row.name, isMe: row.profileId === viewer.id },
    stage:
      row.stageId !== null && row.stageTitle !== null
        ? { id: row.stageId, title: row.stageTitle }
        : null,
    task: row.taskTitle === null ? null : { id: row.ref, title: row.taskTitle },
    reflection: row.reflection,
    reactions: [...(reactions.get(JSON.stringify(eventIdentity(row)))?.values() ?? [])],
  }));
  return { group, events, nextCursor };
}

export async function updateTimelineReaction(
  db: Db,
  viewer: Caller,
  groupId: string,
  key: string,
  emoji: string,
  remove: boolean,
): Promise<Reaction[]> {
  const match = /^(stage_start|stage_clear|task_pass|ahead):([a-f0-9]{24}):(.+)$/s.exec(key);
  if (!match) throw new ApiError("Not found", 404);
  const [, kind, handle, ref] = match;
  const [members, ids] = await Promise.all([
    db.all<{ id: string }>(
      sql`select profile_id id from group_members where group_id = ${groupId}`,
    ),
    visibleStageIds(db, viewer),
  ]);
  const handles = await Promise.all(
    members.map(async ({ id }) => [await memberHandle(groupId, id), id] as const),
  );
  const profileId = new Map(handles).get(handle);
  if (!profileId) throw new ApiError("Not found", 404);

  const [event] = await db.all<EventIdentity>(sql`
    ${timelineEvents(groupId, viewer.id, ids, profileId)}
    select kind, ref, profileId from visible_events where kind = ${kind} and ref = ${ref} limit 1
  `);
  if (!event) throw new ApiError("Not found", 404);
  if (profileId === viewer.id) throw new ApiError("自分の節目にはスタンプを押せません", 400);

  const ownReactions = sql`group_id = ${groupId} and kind = ${kind} and target_profile_id = ${profileId}
    and ref = ${ref} and from_profile_id = ${viewer.id}`;
  if (remove) {
    await db.run(
      sql`delete from group_activity_reactions where ${ownReactions} and emoji = ${emoji}`,
    );
  } else {
    // 上限の確認と INSERT を同じ文にまとめ、並行リクエストでも上限を守る。
    await db.run(sql`
      insert into group_activity_reactions
        (group_id, kind, target_profile_id, ref, from_profile_id, emoji, created_at)
      select ${groupId}, ${kind}, ${profileId}, ${ref}, ${viewer.id}, ${emoji}, ${Date.now()}
      where (select count(*) from group_activity_reactions where ${ownReactions})
        < ${MAX_REACTIONS_PER_EVENT_PER_USER}
      on conflict do nothing
    `);
  }
  const summaries = await eventReactions(db, groupId, viewer.id, [event]);
  const reactions = summaries.get(JSON.stringify(eventIdentity(event)));
  if (!remove && !reactions?.get(emoji)?.mine)
    throw new ApiError("1 つの節目に押せるスタンプは 10 種類までです", 409);
  return [...(reactions?.values() ?? [])];
}

export async function revokeTimelineReflection(
  db: Db,
  viewer: Caller,
  groupId: string,
  key: string,
) {
  const handle = await memberHandle(groupId, viewer.id);
  const prefix = `task_pass:${handle}:`;
  if (!key.startsWith(prefix) || key.length === prefix.length) throw new ApiError("Not found", 404);
  const taskId = key.slice(prefix.length);
  const ids = await visibleStageIds(db, viewer);
  const [event] = await db.all<{ ref: string }>(sql`
    ${timelineEvents(groupId, viewer.id, ids, viewer.id)}
    select ref from visible_events where kind = 'task_pass' and ref = ${taskId} limit 1
  `);
  if (!event) throw new ApiError("Not found", 404);
  await db.run(sql`
    update submissions set share_reflection = 0
    where student_id = ${viewer.id} and task_id = ${taskId} and share_reflection = 1
  `);
}
