/**
 * 週次の育成メモ (#38・07 §6.5)。staff が読み、一言の声掛けかペースの調整をする。
 *
 * - 読めるのは staff 全員 (有効な受講者のメモ)。受講者本人には返さない
 *   (メモは AI の所見を含むので、人が確定する前の AI の所見を受講者に見せない 07 §6.3 も守る)。
 * - 一言の声掛けは受講者への通知 (`mentor_message`) で、本文は講師が書いた文だけを送る。
 * - ペースの調整は既存の学習ペースの編集 (`PATCH /api/learning-pace/:userId`) で行い、
 *   ここには対応として記録する (調整後のペースはサーバーが読み直して残す)。
 */

import {
  MEMO_MESSAGE_MAX,
  type MentorMemoActionRecord,
} from "@stella/shared/mentoring/weekly-memo";
import { addStudyDays, toStudyDate } from "@stella/shared/study/activity";
import { isStudyDate, studyWeekStart } from "@stella/shared/study/pace";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { mentorMemos, notifications, profiles } from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller, requireAdmin } from "../lib/authz.js";
import { isMemoAction, memoWeekOf, mentorMemoView } from "../lib/mentor-memo.js";

export const mentorMemosRoute = new Hono<{ Bindings: Env }>();

async function loadMemo(db: Db, id: string) {
  const [row] = await db
    .select({ memo: mentorMemos, learnerName: profiles.displayName })
    .from(mentorMemos)
    .innerJoin(profiles, eq(profiles.id, mentorMemos.learnerId))
    .where(and(eq(mentorMemos.id, id), eq(profiles.disabled, false)))
    .limit(1);
  if (!row) throw new ApiError("育成メモが見つかりません", 404);
  return row;
}

mentorMemosRoute.get("/api/mentor-memos", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireAdmin(caller);
    const week = c.req.query("week") || memoWeekOf(toStudyDate(new Date()));
    if (!isStudyDate(week) || studyWeekStart(week) !== week)
      throw new ApiError("週は月曜の日付 (YYYY-MM-DD) で指定してください", 400);
    const rows = await db
      .select({ memo: mentorMemos, learnerName: profiles.displayName })
      .from(mentorMemos)
      .innerJoin(profiles, eq(profiles.id, mentorMemos.learnerId))
      .where(and(eq(mentorMemos.weekStart, week), eq(profiles.disabled, false)))
      .orderBy(asc(profiles.displayName), asc(mentorMemos.learnerId));
    return c.json({
      week,
      weekEnd: addStudyDays(week, 6),
      memos: rows.map((r) => mentorMemoView(r.memo, r.learnerName)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

mentorMemosRoute.post("/api/mentor-memos/:id/actions", async (c) => {
  try {
    const { db, caller } = await getCaller(c);
    requireAdmin(caller);
    const { memo } = await loadMemo(db, c.req.param("id"));
    const body = (await c.req.json().catch(() => null)) as {
      kind?: unknown;
      message?: unknown;
    } | null;
    if (!body || typeof body !== "object" || Array.isArray(body) || !isMemoAction(body.kind))
      throw new ApiError("対応を選んでください", 400);
    if (memo.state === "failed") throw new ApiError("この週の育成メモは作れませんでした", 409);
    if (memo.state !== "ready") throw new ApiError("育成メモを作成中です", 409);
    const now = new Date();
    const record: MentorMemoActionRecord = {
      kind: body.kind,
      at: now.toISOString(),
      by: caller.id,
    };
    let notify: typeof notifications.$inferInsert | null = null;
    if (body.kind === "message") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message || message.length > MEMO_MESSAGE_MAX)
        throw new ApiError(`一言は1〜${MEMO_MESSAGE_MAX}文字で入力してください`, 400);
      record.detail = message;
      // 本文は講師が書いた文だけ。メモ・材料・AI の所見は載せない。
      notify = {
        userId: memo.learnerId,
        type: "mentor_message",
        title: `${caller.name}さんからの一言`,
        body: message,
        payload: { from_id: caller.id },
        createdAt: now,
      };
    } else if (body.kind === "pace") {
      // 調整そのものは学習ペースの編集で済ませてある。ここでは調整後の値を読み直して残す。
      const [learner] = await db
        .select({ weeklyHours: profiles.weeklyHours, startDate: profiles.learningStartDate })
        .from(profiles)
        .where(eq(profiles.id, memo.learnerId))
        .limit(1);
      if (!learner) throw new ApiError("受講者が見つかりません", 404);
      record.detail = `週${learner.weeklyHours}時間 · 開始${learner.startDate ?? "は初回受講日"}`;
    }
    const update = db
      .update(mentorMemos)
      .set({
        actions: sql`json_insert(${mentorMemos.actions}, '$[#]', json(${JSON.stringify(record)}))`,
        handledAt: sql`coalesce(${mentorMemos.handledAt}, ${now.getTime()})`,
      })
      .where(eq(mentorMemos.id, memo.id));
    if (notify) await db.batch([db.insert(notifications).values(notify), update]);
    else await update;
    const updated = await loadMemo(db, memo.id);
    return c.json({ memo: mentorMemoView(updated.memo, updated.learnerName) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
