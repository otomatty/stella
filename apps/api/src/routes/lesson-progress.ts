/**
 * レッスン進捗 API (旧 lesson_progress テーブル直アクセス + upsert_lesson_progress RPC)。
 *
 * 旧 RLS の置き換え (アプリ層認可):
 *   - 受講者は自分の進捗のみ read/write   … user_id = caller.id を強制
 *   - 講師 / 管理者は同テナントを read    … requireRole + tenant_id = caller.tenantId
 *
 * 端末間 Last-Write-Wins は upsert の setWhere (excluded.updated_at > 既存) で担保する
 * (旧 upsert_lesson_progress RPC と同じ意味論)。
 *
 * upsert 時は日別学習ログ (`study_activity`) の当日分もサーバ側で加算する (Issue #73)。
 */

import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { normalizeProgressRows, type ProgressSyncInput } from "@falcon/shared/study/progress-sync";

import { getCaller, errorResponse, requireRole } from "../lib/authz.js";
import { lessonProgress } from "../db/schema.js";
import { buildStudyActivityIncrement } from "../lib/study-activity.js";
import type { Env } from "../env.js";

export const lessonProgressRoute = new Hono<{ Bindings: Env }>();

const SELECT = {
  user_id: lessonProgress.userId,
  lesson_id: lessonProgress.lessonId,
  completed: lessonProgress.completed,
  last_page: lessonProgress.lastPage,
  viewed_pages: lessonProgress.viewedPages,
  watched_sec: lessonProgress.watchedSec,
  updated_at: lessonProgress.updatedAt,
} as const;

/** 受講者本人の全進捗。 */
lessonProgressRoute.get("/api/lesson-progress", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select(SELECT)
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, caller.id));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 講師 / 管理者: 同テナントの進捗 (可視化のデータ経路)。 */
lessonProgressRoute.get("/api/lesson-progress/tenant", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const rows = await db
      .select(SELECT)
      .from(lessonProgress)
      .where(eq(lessonProgress.tenantId, caller.tenantId));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者本人の進捗を一括 upsert (端末間 LWW)。 */
lessonProgressRoute.post("/api/lesson-progress", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as { rows?: ProgressSyncInput[] };
    const inputs = Array.isArray(body.rows) ? body.rows : [];
    if (inputs.length === 0) return c.json({ ok: true, written: 0 });

    // 不正行の除去と同一 lesson_id の集約 (SQLite の upsert は 1 文で同じ行を 2 度
    // 更新できないため、 重複を残すとリクエストごと失敗する)。
    const rows = normalizeProgressRows(inputs);
    if (rows.length === 0) return c.json({ ok: true, written: 0 });

    const values = rows.map((r) => ({
      tenantId: caller.tenantId,
      userId: caller.id,
      lessonId: r.lessonId,
      completed: r.completed,
      lastPage: r.lastPage,
      viewedPages: r.viewedPages,
      watchedSec: r.watchedSec,
      updatedAt: new Date(r.updatedAtMs),
    }));

    // 日別ログの加算量と LWW 判定は DB 側の 1 文に閉じ込める (アプリ側で先に SELECT して
    // 差分を計算すると、 割り込みリクエストがあったとき進捗とログがズレる)。
    const activityIncrements = rows
      .filter((r) => r.countsTowardActivity)
      .map((r) => buildStudyActivityIncrement(db, caller.tenantId, caller.id, r));

    const progressUpsert = db
      .insert(lessonProgress)
      .values(values)
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          completed: sql`excluded.completed`,
          lastPage: sql`excluded.last_page`,
          viewedPages: sql`excluded.viewed_pages`,
          watchedSec: sql`excluded.watched_sec`,
          updatedAt: sql`excluded.updated_at`,
        },
        // conflict 時、 payload の updated_at が既存より新しい場合のみ更新 (LWW)。
        setWhere: sql`excluded.updated_at > ${lessonProgress.updatedAt}`,
      });

    const [firstIncrement, ...restIncrements] = activityIncrements;
    if (firstIncrement === undefined) {
      await progressUpsert;
    } else {
      // 1 トランザクション (D1 batch) で書く。 日別ログの文は更新前の lesson_progress を
      // 読んで増分を出すため、 必ず進捗 upsert より先に置くこと。
      await db.batch([firstIncrement, ...restIncrements, progressUpsert]);
    }

    return c.json({ ok: true, written: values.length });
  } catch (err) {
    return errorResponse(c, err);
  }
});
