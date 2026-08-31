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
import { eq } from "drizzle-orm";
import { normalizeProgressRows, type ProgressSyncInput } from "@falcon/shared/study/progress-sync";

import { getCaller, errorResponse, requireRole } from "../lib/authz.js";
import { clientIp } from "../lib/audit.js";
import { lessonProgress } from "../db/schema.js";
import {
  executeLessonProgressWrites,
  assertProgressSyncSize,
} from "../lib/lesson-progress-write.js";
import { autoCompleteStagesIfMet, stageIdsOfLessons } from "../lib/stage-auto-complete.js";
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
    assertProgressSyncSize(inputs.length);

    // 不正行の除去と同一 lesson_id の集約 (SQLite の upsert は 1 文で同じ行を 2 度
    // 更新できないため、 重複を残すとリクエストごと失敗する)。
    const rows = normalizeProgressRows(inputs);
    if (rows.length === 0) return c.json({ ok: true, written: 0 });
    assertProgressSyncSize(rows.length);

    await executeLessonProgressWrites(db, caller.tenantId, caller.id, rows);

    // 完了レッスンを含む同期は修了条件の自動判定を掛ける (満たしていれば修了証を
    // 自動発行してクリアになる)。cleared_stages を画面が読んでクリアダイアログを出す。
    const completedLessonIds = rows.filter((r) => r.completed).map((r) => r.lessonId);
    const clearedStages =
      completedLessonIds.length > 0
        ? await autoCompleteStagesIfMet(db, {
            actor: caller,
            userId: caller.id,
            stageIds: await stageIdsOfLessons(db, completedLessonIds),
            ip: clientIp(c),
          })
        : [];

    return c.json({ ok: true, written: rows.length, cleared_stages: clearedStages });
  } catch (err) {
    return errorResponse(c, err);
  }
});
