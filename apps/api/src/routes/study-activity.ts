/**
 * 学習アクティビティ API (Issue #73)。
 *
 * `study_activity` に積んだ日別ログを集計し、 週間学習チャート / 連続学習ストリークの
 * データ経路にする。 受講者は自分のログのみ参照できる (user_id = caller.id を強制)。
 */

import { Hono } from "hono";
import { and, eq, gte } from "drizzle-orm";
import {
  addStudyDays,
  buildStudySeries,
  computeStreaks,
  toStudyDate,
  type StudyActivityDay,
} from "@falcon/shared/study/activity";

import { errorResponse, getCaller } from "../lib/authz.js";
import { studyActivity } from "../db/schema.js";
import type { Env } from "../env.js";

export const studyActivityRoute = new Hono<{ Bindings: Env }>();

const DEFAULT_DAYS = 14;
const MAX_DAYS = 90;
/**
 * ストリーク算出のために遡る日数。 表示窓 (days) より長く見ないと、 窓の外まで続いている
 * 連続記録を取りこぼす。 1 ユーザー 1 日 1 行なので最大でもこの件数しか読まない。
 *
 * 既知の制約: 365 日を超える連続学習は 365 日として頭打ちになる (current / longest とも)。
 * 1 年連続の受講者は現実的に想定していないため MVP では許容する。 必要になったら遡り幅を
 * 広げるか、 ストリークを別途永続化する。
 */
const STREAK_LOOKBACK_DAYS = 365;

function parseDays(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}

/** 受講者本人の日別学習ログ + ストリーク。 */
studyActivityRoute.get("/api/study-activity/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const days = parseDays(c.req.query("days"));
    const now = new Date();
    const today = toStudyDate(now);
    const from = addStudyDays(today, -(Math.max(days, STREAK_LOOKBACK_DAYS) - 1));

    const rows = await db
      .select({
        date: studyActivity.date,
        watchedSec: studyActivity.watchedSec,
        completedLessons: studyActivity.completedLessons,
      })
      .from(studyActivity)
      .where(
        and(
          eq(studyActivity.userId, caller.id),
          eq(studyActivity.tenantId, caller.tenantId),
          gte(studyActivity.date, from),
        ),
      );

    const all: StudyActivityDay[] = rows.map((r) => ({
      date: r.date,
      watched_sec: r.watchedSec,
      completed_lessons: r.completedLessons,
    }));
    const series = buildStudySeries(all, today, days);
    const streaks = computeStreaks(all, today);

    return c.json({
      activity: {
        days: series,
        current_streak: streaks.current,
        longest_streak: streaks.longest,
        total_sec: series.reduce((s, d) => s + d.watched_sec, 0),
        today_sec: series[series.length - 1]?.watched_sec ?? 0,
        today,
        generated_at: now.toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
