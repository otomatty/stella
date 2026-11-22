import { sql } from "drizzle-orm";
import type {
  IntegrationProgress,
  IntegrationEvent,
  IntegrationSource,
} from "@stella/shared/integrations/types";
import type { Db } from "../db/client.js";
import { lastLearningDate } from "./last-learning-date.js";
import { ApiError } from "./authz.js";
import {
  loadProblemRevisionHashes,
  problemResultCounts,
  type ProblemRevisionHashes,
} from "./task-problem-hashes.js";
import { readTaskDefinition } from "./task-problem-submission.js";

export function encodePosition(value: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodePosition(value: string): unknown {
  try {
    if (value.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    return JSON.parse(
      decodeURIComponent(escape(atob(value.replaceAll("-", "+").replaceAll("_", "/")))),
    );
  } catch {
    throw new ApiError("Invalid cursor", 400);
  }
}
export function parseIntegrationAt(value?: string): number | null {
  if (value === undefined) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new ApiError("Invalid at", 400);
  const day = value.slice(0, 10);
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day)
    throw new ApiError("Invalid at", 400);
  return Date.parse(value);
}
const iso = (value: number | null) => (value === null ? null : new Date(value).toISOString());
const passed = (status: string | null) => status === "passed" || status === "ai-passed";

interface ProblemRow {
  problemId: string;
  contentHash: string;
  source: "tests" | "manual";
  firstPassedAt: number;
}
function problemSummary(
  definition: string,
  hash: string,
  rows: ProblemRow[],
  taskPassed: boolean,
  revisions?: ProblemRevisionHashes,
) {
  const problems = readTaskDefinition(definition).problems;
  if (!problems) return undefined;
  const current = new Set(problems.map((p) => p.id));
  const sources = new Map<string, ProblemRow["source"]>();
  // 履歴は新しい順。数える版の中で各問題のいちばん新しい出所だけを使う。
  for (const row of rows) {
    if (
      current.has(row.problemId) &&
      !sources.has(row.problemId) &&
      problemResultCounts(row, hash, taskPassed, revisions)
    ) {
      sources.set(row.problemId, row.source);
    }
  }
  return { total: problems.length, passed: sources.size, sources: [...new Set(sources.values())] };
}

/** 固定回数のクエリ。各クエリで同じメンバーページとグループのステージを結合する。 */
export async function readIntegrationProgress(
  db: Db,
  groupId: string,
  query: { stage?: string; at?: string; cursor?: string },
): Promise<IntegrationProgress> {
  const at = parseIntegrationAt(query.at);
  let after = "";
  if (query.cursor !== undefined) {
    const position = decodePosition(query.cursor);
    if (
      !Array.isArray(position) ||
      position.length !== 5 ||
      position[0] !== "progress-v1" ||
      position[1] !== groupId ||
      position[2] !== (query.stage ?? null) ||
      position[3] !== at ||
      typeof position[4] !== "string"
    )
      throw new ApiError("Invalid cursor", 400);
    after = position[4];
  }
  const page = sql`select p.id, p.email, p.display_name, m.external_id from integration_group_members m join profiles p on p.id=m.profile_id where m.group_id=${groupId} and p.role='student' and p.id > ${after} order by p.id limit 200`;
  const scope = sql`select s.id, s.slug from integration_group_stages gs join stages s on s.id=gs.stage_id where gs.group_id=${groupId} ${query.stage === undefined ? sql`` : sql`and s.slug=${query.stage}`}`;
  const members = await db.all<{
    id: string;
    email: string;
    display_name: string;
    external_id: string | null;
    last_active: string;
  }>(
    sql`select p.*, ${at === null ? lastLearningDate(sql`p.id`) : sql`null`} last_active from (${page}) p`,
  );
  const stageRows = await db.all<{ id: string; slug: string }>(sql`${scope} order by s.slug,s.id`);
  const [enrolled, taskRows, progress, passes, problems, more] = await Promise.all([
    db.all<{
      user_id: string;
      stage_id: string;
      enrolled_at: number | null;
      completed_at: number | null;
    }>(
      at === null
        ? sql`select e.user_id,e.stage_id,e.enrolled_at,e.completed_at from enrollments e join (${page}) p on p.id=e.user_id join (${scope}) s on s.id=e.stage_id`
        : sql`with history as (
            select e.user_id,e.stage_id,e.type,e.occurred_at,e.seq
            from integration_events e join (${page}) p on p.id=e.user_id join (${scope}) s on s.id=e.stage_id
            where e.type in ('stage_started','stage_cleared','stage_clear_revoked','stage_unassigned') and e.occurred_at <= ${at}
          ), fields as (
            select *,'started' field from history where type in ('stage_started','stage_unassigned')
            union all
            select *,'cleared' field from history where type in ('stage_cleared','stage_clear_revoked','stage_unassigned')
          ), latest as (
            select *,row_number() over (partition by user_id,stage_id,field order by seq desc) position from fields
          ) select user_id,stage_id,
              max(case when field='started' and type='stage_started' then occurred_at end) enrolled_at,
              max(case when field='cleared' and type='stage_cleared' then occurred_at end) completed_at
            from latest where position=1 group by user_id,stage_id`,
    ),
    db.all<{
      id: string;
      title: string;
      unit_id: string;
      unit_title: string;
      stage_id: string;
      definition: string;
      content_hash: string;
    }>(
      sql`select t.id,t.title,u.id unit_id,u.title unit_title,u.stage_id,t.definition,t.content_hash from tasks t join sections u on u.id=t.section_id join (${scope}) s on s.id=u.stage_id where t.active=1 and t.variant_of is null order by u."order",u.id,t."order",t.id`,
    ),
    db.all<{ user_id: string; task_id: string; status: string; passed_at: number | null }>(
      sql`select tp.user_id,tp.task_id,tp.status,tp.passed_at from task_progress tp join (${page}) p on p.id=tp.user_id join tasks t on t.id=tp.task_id join sections u on u.id=t.section_id join (${scope}) s on s.id=u.stage_id`,
    ),
    db.all<{
      user_id: string;
      task_id: string;
      id: string | null;
      source: IntegrationSource | null;
      reviewed_at: number | null;
      type: "task_passed" | "task_returned";
    }>(
      at === null
        ? sql`select x.student_id user_id,x.task_id,x.id,x.review_source source,x.reviewed_at,'task_passed' type from submissions x join (${page}) p on p.id=x.student_id join tasks t on t.id=x.task_id join sections u on u.id=t.section_id join (${scope}) s on s.id=u.stage_id where x.verdict='pass' order by x.attempt desc,x.id`
        : sql`with history as (
            select e.user_id,e.task_id,e.submission_id id,e.source,e.occurred_at reviewed_at,e.type,e.submission_attempt,e.seq,
              sum(case when e.type='task_pass_revoked' then 1 else 0 end) over (
                partition by e.user_id,e.task_id,e.submission_id order by e.occurred_at,e.seq
              ) pass_period
            from integration_events e join (${page}) p on p.id=e.user_id join (${scope}) s on s.id=e.stage_id
            where e.type in ('task_passed','task_pass_revoked') and e.occurred_at <= ${at}
          ), decisions as (
            select *,min(case when type='task_passed' then reviewed_at end) over (
                partition by user_id,task_id,id,pass_period
              ) first_passed_at,
              row_number() over (partition by user_id,task_id,id order by reviewed_at desc,seq desc) position
            from history
          ), remaining as (
            select *,min(first_passed_at) over (partition by user_id,task_id) task_passed_at,
              row_number() over (partition by user_id,task_id order by submission_attempt desc,id) chosen
            from decisions where position=1 and type='task_passed'
          ) select user_id,task_id,id,source,task_passed_at reviewed_at,type from remaining where chosen=1`,
    ),
    db.all<ProblemRow & { user_id: string; task_id: string }>(
      at === null
        ? sql`select r.user_id,r.task_id,r.problem_id problemId,r.content_hash contentHash,r.source,r.first_passed_at firstPassedAt from task_problem_results r join (${page}) p on p.id=r.user_id join tasks t on t.id=r.task_id join sections u on u.id=t.section_id join (${scope}) s on s.id=u.stage_id`
        : sql`select user_id,task_id,problemId,contentHash,source,firstPassedAt from (
            select e.user_id,e.task_id,e.problem_id problemId,e.content_hash contentHash,e.source,e.occurred_at firstPassedAt,e.seq sequence,e.type,
              row_number() over (partition by e.user_id,e.task_id,e.problem_id,e.content_hash order by e.occurred_at desc,e.seq desc) position
            from integration_events e join (${page}) p on p.id=e.user_id join (${scope}) s on s.id=e.stage_id
            where e.type in ('problem_passed','problem_pass_revoked') and e.occurred_at <= ${at}
          ) where position=1 and type='problem_passed' order by firstPassedAt desc,sequence desc`,
    ),
    db.all<{ id: string }>(
      sql`select p.id from integration_group_members m join profiles p on p.id=m.profile_id where m.group_id=${groupId} and p.role='student' and p.id > ${after} order by p.id limit 1 offset 200`,
    ),
  ]);
  // 索引を作り、人数×全履歴の走査も避ける。
  const key = (user: string, task: string) => JSON.stringify([user, task]);
  const progressMap = new Map(progress.map((r) => [key(r.user_id, r.task_id), r]));
  const passMap = new Map<string, (typeof passes)[number]>();
  for (const r of passes)
    if (!passMap.has(key(r.user_id, r.task_id))) passMap.set(key(r.user_id, r.task_id), r);
  const problemMap = new Map<string, ProblemRow[]>();
  for (const r of problems) {
    const k = key(r.user_id, r.task_id);
    const list = problemMap.get(k) ?? [];
    list.push(r);
    problemMap.set(k, list);
  }
  const tasksById = new Map(taskRows.map((task) => [task.id, task]));
  const hashes = await loadProblemRevisionHashes(
    db,
    problems.flatMap((row) => {
      const task = tasksById.get(row.task_id);
      if (!task) return [];
      const k = key(row.user_id, row.task_id);
      return [
        {
          taskId: task.id,
          currentHash: task.content_hash,
          rows: [row],
          taskPassed:
            at === null
              ? passed(progressMap.get(k)?.status ?? null)
              : passMap.get(k)?.type === "task_passed",
        },
      ];
    }),
  );
  return {
    members: members.map((member) => ({
      id: member.id,
      externalId: member.external_id,
      email: member.email,
      displayName: member.display_name,
      ...(at === null ? { lastActiveDate: member.last_active || null } : {}),
      stages: stageRows.map((stage) => {
        const e = enrolled.find((r) => r.user_id === member.id && r.stage_id === stage.id);
        const started = e?.enrolled_at ?? null;
        const cleared = e?.completed_at ?? null;
        const units: IntegrationProgress["members"][number]["stages"][number]["units"] = [];
        for (const task of taskRows.filter((r) => r.stage_id === stage.id)) {
          let unit = units.find((u) => u.id === task.unit_id);
          if (!unit) {
            unit = { id: task.unit_id, title: task.unit_title, tasks: [] };
            units.push(unit);
          }
          const k = key(member.id, task.id),
            tp = progressMap.get(k),
            pass = passMap.get(k);
          const isPassed = at === null ? passed(tp?.status ?? null) : pass?.type === "task_passed";
          unit.tasks.push({
            id: task.id,
            title: task.title,
            ...(at === null
              ? {
                  status: tp?.status ?? "not-started",
                  pendingReview: tp?.status === "instructor-pending",
                }
              : {}),
            passed: isPassed,
            passedAt: isPassed
              ? iso(
                  at === null
                    ? (tp?.passed_at ?? pass?.reviewed_at ?? null)
                    : (pass?.reviewed_at ?? null),
                )
              : null,
            source: isPassed ? (pass?.source ?? null) : null,
            ...(pass?.id && (at === null || isPassed)
              ? { submissionUrl: `/submissions/${encodeURIComponent(pass.id)}` }
              : {}),
            problems: problemSummary(
              task.definition,
              task.content_hash,
              problemMap.get(k) ?? [],
              isPassed,
              hashes.get(task.id),
            ),
          });
        }
        return {
          slug: stage.slug,
          status: cleared !== null ? "cleared" : started !== null ? "started" : "assigned",
          startedAt: iso(started),
          clearedAt: iso(cleared),
          progressUrl: `/task-manual-completion?userId=${encodeURIComponent(member.id)}&stageId=${encodeURIComponent(stage.id)}`,
          units,
        };
      }),
    })),
    next:
      more.length && members.length
        ? encodePosition([
            "progress-v1",
            groupId,
            query.stage ?? null,
            at,
            members[members.length - 1]?.id,
          ])
        : null,
    hasMore: more.length > 0,
  };
}

/** 保存順で続きを読む。問題は位置以後の連続した同じ課題・日時の範囲だけでまとめる。 */
export async function readIntegrationEvents(db: Db, groupId: string, after?: string) {
  let sequence = 0;
  if (after !== undefined) {
    const p = decodePosition(after);
    if (
      !Array.isArray(p) ||
      p.length !== 3 ||
      p[0] !== "events-v2" ||
      p[1] !== groupId ||
      !Number.isSafeInteger(p[2]) ||
      p[2] < 0
    )
      throw new ApiError("Invalid cursor", 400);
    sequence = p[2];
  }
  const rows = await db.all<{
    id: string;
    type: IntegrationEvent["type"];
    time: number;
    seq: number;
    user_id: string;
    external_id: string | null;
    slug: string;
    task_id: string | null;
    source: IntegrationSource | null;
    reason: IntegrationEvent["reason"];
    count: number | null;
    submission_id: string | null;
    definition: string | null;
    content_hash: string | null;
    status: string | null;
    problems: string;
  }>(sql`with
    members as (select m.profile_id,m.external_id from integration_group_members m join profiles p on p.id=m.profile_id where m.group_id=${groupId} and p.role='student'),
    scope as (select s.id,s.slug from integration_group_stages gs join stages s on s.id=gs.stage_id where gs.group_id=${groupId}),
    scoped as (select e.*,m.external_id,s.slug from integration_events e join members m on m.profile_id=e.user_id join scope s on s.id=e.stage_id
      left join tasks t on t.id=e.task_id where e.seq > ${sequence} and (e.task_id is null or (t.active=1 and t.variant_of is null))),
    keyed as (select *,case when type in ('problem_passed','problem_pass_revoked') then json_array(type,user_id,task_id,occurred_at) else json_array('event',seq) end group_key from scoped),
    marked as (select *,case when group_key=lag(group_key) over (order by seq) then 0 else 1 end group_start from keyed),
    numbered as (select *,sum(group_start) over (order by seq) group_number from marked),
    events as (
      select id,type,occurred_at time,seq,user_id,external_id,slug,task_id,source,reason,null count,submission_id from numbered where type not in ('problem_passed','problem_pass_revoked')
      union all
      select json_array(type,user_id,task_id,occurred_at,min(seq),max(seq)),case when type='problem_passed' then 'problems_passed' else 'problems_revoked' end,occurred_at,max(seq),user_id,external_id,slug,task_id,null,null,count(distinct problem_id),null from numbered where type in ('problem_passed','problem_pass_revoked') group by group_number,type,user_id,task_id,occurred_at
    ),
    page as (select * from events order by seq limit 501)
    select page.*, t.definition,t.content_hash,tp.status,
      coalesce((select json_group_array(json_object('problemId',r.problem_id,'contentHash',r.content_hash,'source',r.source,'firstPassedAt',r.first_passed_at)) from task_problem_results r where r.user_id=page.user_id and r.task_id=page.task_id),'[]') problems
    from page left join tasks t on t.id=page.task_id left join task_progress tp on tp.user_id=page.user_id and tp.task_id=page.task_id order by page.seq`);
  const page = rows.slice(0, 500);
  const problemRows = page.map((row) =>
    row.type === "problems_passed" || row.type === "problems_revoked"
      ? (JSON.parse(row.problems) as ProblemRow[])
      : [],
  );
  const hashes = await loadProblemRevisionHashes(
    db,
    page.flatMap((row, index) =>
      row.task_id && row.content_hash
        ? [
            {
              taskId: row.task_id,
              currentHash: row.content_hash,
              rows: problemRows[index],
              taskPassed: passed(row.status),
            },
          ]
        : [],
    ),
  );
  const events: IntegrationEvent[] = page.map((r, index) => ({
    id: r.id,
    type: r.type,
    occurredAt: new Date(r.time).toISOString(),
    person: { id: r.user_id, externalId: r.external_id },
    stage: r.slug,
    ...(r.task_id === null ? {} : { taskId: r.task_id }),
    ...(r.type === "task_passed" ? { source: r.source } : {}),
    ...(r.type === "task_pass_revoked" ? { reason: r.reason } : {}),
    ...(r.submission_id === null
      ? {}
      : { submissionUrl: `/submissions/${encodeURIComponent(r.submission_id)}` }),
    ...(r.type !== "problems_passed" && r.type !== "problems_revoked"
      ? {}
      : {
          count: r.count ?? 0,
          problemsPassed:
            problemSummary(
              r.definition ?? "{}",
              r.content_hash ?? "",
              problemRows[index],
              passed(r.status),
              hashes.get(r.task_id ?? ""),
            )?.passed ?? 0,
        }),
  }));
  const last = page[page.length - 1];
  return {
    events,
    next: last ? encodePosition(["events-v2", groupId, last.seq]) : (after ?? null),
    hasMore: rows.length > 500,
  };
}
