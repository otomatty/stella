import { LEGACY_TENANT_ID } from "@stella/shared/legacy-tenant";
import { addStudyDays, studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { notifications } from "../db/schema.js";
import { learnerOnly } from "./learner-scope.js";

const MAX_DIGESTS_PER_RUN = 200;
const MAX_EMOJIS_PER_DIGEST = 5;

/** 日本時間で締まった日ごとに、受け取った本人へ 1 通送る (#342)。 */
export async function notifyGroupReactionDigests(db: Db, now = new Date()): Promise<void> {
  const today = toStudyDate(now);
  const yesterday = addStudyDays(today, -1);
  const dayBeforeYesterday = addStudyDays(today, -2);
  const todayStart = studyDateStartMs(today);
  const yesterdayStart = studyDateStartMs(yesterday);
  const dayBeforeYesterdayStart = studyDateStartMs(dayBeforeYesterday);

  // 集計と通知を 1 文で書き、途中で所属や公開設定が変わっても古い条件で通知しない。
  await db
    .insert(notifications)
    .select(sql`
      -- 日ごとに分ける前に、索引を使って対象の 2 日分を一度だけ読む。
      with recent as materialized (
        select group_id, target_profile_id, from_profile_id, emoji, created_at, rowid as reaction_rowid
        from group_activity_reactions indexed by group_activity_reactions_created
        where created_at >= ${dayBeforeYesterdayStart} and created_at < ${todayStart}
      ), days(date, start_at, end_at) as (values
        (${dayBeforeYesterday}, ${dayBeforeYesterdayStart}, ${yesterdayStart}),
        (${yesterday}, ${yesterdayStart}, ${todayStart})
      ), eligible as (
        select d.date, 'group-reactions:' || recipient.id || ':' || d.date as id,
          recipient.id as user_id, r.group_id, r.emoji, r.created_at, r.reaction_rowid
        from days d
        join recent r on r.created_at >= d.start_at and r.created_at < d.end_at
        join groups g on g.id = r.group_id and g.share_activity = 1
        join group_members target_member
          on target_member.group_id = r.group_id and target_member.profile_id = r.target_profile_id
        join group_members sender_member
          on sender_member.group_id = r.group_id and sender_member.profile_id = r.from_profile_id
        join profiles recipient on recipient.id = target_member.profile_id
        join profiles sender on sender.id = sender_member.profile_id
        where recipient.disabled = 0 and recipient.hide_group_activity = 0
          and ${learnerOnly(sql`recipient.id`)}
          and sender.disabled = 0 and ${learnerOnly(sql`sender.id`)}
          and recipient.id <> sender.id
          and not exists (
            select 1 from notifications n
            where n.id = 'group-reactions:' || recipient.id || ':' || d.date
          )
      ), pending as (
        select date, id, user_id, count(*) as total
        from eligible
        group by date, id, user_id
        order by date, user_id
        limit ${MAX_DIGESTS_PER_RUN}
      ), group_counts as (
        select e.id, e.group_id, count(*) as total
        from eligible e join pending p on p.id = e.id
        group by e.id, e.group_id
      ), emoji_counts as (
        select e.id, e.emoji, e.created_at, e.reaction_rowid,
          count(*) over (partition by e.id, e.emoji) as total,
          row_number() over (partition by e.id, e.emoji order by e.created_at, e.reaction_rowid) as arrival
        from eligible e join pending p on p.id = e.id
      )
      -- INSERT の列順は notifications のスキーマに合わせる。
      select p.id, p.user_id, ${LEGACY_TENANT_ID}, 'group_reactions', '仲間からスタンプが届きました',
        printf('%d月%d日 に %d 件のスタンプが届きました: ', substr(p.date, 6, 2), substr(p.date, 9, 2), p.total)
          || (select group_concat(label, ' ') from (
            select e.emoji || '×' || e.total as label
            from emoji_counts e where e.id = p.id and e.arrival = 1
            order by e.total desc, e.created_at, e.reaction_rowid
            limit ${MAX_EMOJIS_PER_DIGEST}
          )),
        json_object('date', p.date, 'count', p.total, 'group_id', (
          select g.group_id from group_counts g where g.id = p.id order by g.total desc, g.group_id limit 1
        )),
        0, ${now.getTime()}
      from pending p
      -- SQLite で後続の ON CONFLICT と JOIN の ON が曖昧にならないようにする。
      where true
    `)
    .onConflictDoNothing({ target: notifications.id });
}
