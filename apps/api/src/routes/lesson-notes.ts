/**
 * レッスンノート API (Issue #78)。
 *
 * 旧実装はレッスンごとに localStorage (`lms_lesson_notes_v1:`) へ保存していたため端末を
 * またぐと参照できなかった。 サーバ保存に移し、 認可はアプリ層で本人のみに限定する:
 *   - `user_id = caller.id` を強制 (講師 / 管理者にも他人のノートは見せない)
 *
 * 端末間 Last-Write-Wins は upsert の setWhere (excluded.updated_at > 既存) で担保する
 * (`lesson-progress.ts` と同じ意味論)。 upsert 後は確定した行を返し、 クライアントが
 * 「別端末の方が新しくて自分の書き込みが採用されなかった」ことを検知できるようにする。
 */

import { Hono } from "hono";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  normalizeNoteRows,
  type NoteSyncInput,
} from "@falcon/shared/study/notes-sync";

import { getCaller, errorResponse } from "../lib/authz.js";
import { lessonNotes } from "../db/schema.js";
import type { Env } from "../env.js";

export const lessonNotesRoute = new Hono<{ Bindings: Env }>();

const SELECT = {
  lesson_id: lessonNotes.lessonId,
  body: lessonNotes.body,
  updated_at: lessonNotes.updatedAt,
} as const;

/**
 * 受講者本人のノート。 `?lessonId=` があればそのレッスンのみ、 無ければ全件
 * (旧 localStorage からの移行時に、 サーバ側の有無をまとめて確認するため)。
 */
lessonNotesRoute.get("/api/lesson-notes", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const lessonId = c.req.query("lessonId");
    const where =
      lessonId !== undefined && lessonId !== ""
        ? and(eq(lessonNotes.userId, caller.id), eq(lessonNotes.lessonId, lessonId))
        : eq(lessonNotes.userId, caller.id);
    const rows = await db.select(SELECT).from(lessonNotes).where(where);
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 受講者本人のノートを upsert (端末間 LWW)。
 * 単一行 (`{ lesson_id, body, updated_at }`) と一括 (`{ rows: [...] }`) の両方を受ける。
 */
lessonNotesRoute.post("/api/lesson-notes", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as
      | { rows?: NoteSyncInput[] }
      | NoteSyncInput;
    const inputs = Array.isArray((body as { rows?: NoteSyncInput[] }).rows)
      ? ((body as { rows: NoteSyncInput[] }).rows)
      : [body as NoteSyncInput];

    // 不正行の除去と同一 lesson_id の集約 (SQLite の upsert は 1 文で同じ行を 2 度
    // 更新できないため、 重複を残すとリクエストごと失敗する)。 進んだ時計の端末が
    // 勝ち続けないよう、 未来の updated_at はサーバ時刻に丸める。
    const rows = normalizeNoteRows(inputs, Date.now());
    if (rows.length === 0) return c.json({ ok: true, written: 0, rows: [] });

    await db
      .insert(lessonNotes)
      .values(
        rows.map((r) => ({
          tenantId: caller.tenantId,
          userId: caller.id,
          lessonId: r.lessonId,
          body: r.body,
          updatedAt: new Date(r.updatedAtMs),
        })),
      )
      .onConflictDoUpdate({
        target: [lessonNotes.userId, lessonNotes.lessonId],
        set: {
          body: sql`excluded.body`,
          updatedAt: sql`excluded.updated_at`,
        },
        // conflict 時、 payload の updated_at が既存より新しい場合のみ更新 (LWW)。
        setWhere: sql`excluded.updated_at > ${lessonNotes.updatedAt}`,
      });

    // 確定した行を返す。 LWW で自分の書き込みが採用されなかった場合、 クライアントは
    // 送った本文との差分から「別端末の方が新しい」ことを検知できる。
    const stored = await db
      .select(SELECT)
      .from(lessonNotes)
      .where(
        and(
          eq(lessonNotes.userId, caller.id),
          inArray(
            lessonNotes.lessonId,
            rows.map((r) => r.lessonId),
          ),
        ),
      );

    return c.json({ ok: true, written: rows.length, rows: stored });
  } catch (err) {
    return errorResponse(c, err);
  }
});
