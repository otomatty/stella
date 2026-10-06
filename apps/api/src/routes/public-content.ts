/**
 * ログインなしで読める教材 API (Issue #41)。
 *
 *   GET /api/public/units          … 公開の単元とレッスンの一覧 (本文なし)
 *   GET /api/public/lessons/:id    … 公開のレッスン 1 件 (本文つき)
 *
 * VS Code を入れる前に読む `dev-env-basics` の最初の単元 (06 の U00〜U01) を、未ログインの
 * ブラウザーで読めるようにする (07 §12.1 の手順 1)。教材の `unit.json` に `"public": true` を
 * 書いた単元のスライドとまとめに、seed が `lessons.public` の印を付ける。
 *
 * 認証付きの API とは別の経路にし、既存の API の認可は緩めない。返すのは次をすべて満たす
 * レッスンだけ (印は教材の検査でも縛っているが、ここでも重ねて確かめる):
 *   - 印 (`lessons.public`) のある slides / text のレッスンで、本文がある
 *   - 課題文のレッスン (`tasks.lesson_id`) ではない
 *   - 公開テナント (`PUBLIC_CONTENT_TENANT_ID`) の、公開中 (published)・catalog・前提なしの
 *     format 2 のステージにある (霧やロックの向こうの講座・専用星の本文は返さない)
 * 知識問題・課題・private/・受講者のデータ・ステージの説明や前提は返さない。存在しないものと
 * 条件を満たさないものは同じ 404 にする (印の有無を応答の違いで漏らさない)。
 *
 * テナントは JWT から決まらないので `PUBLIC_CONTENT_TENANT_ID` (wrangler.toml の [vars]) で
 * 決める。リクエストからは選ばせない。未設定なら何も返さない (一覧は空、本文は 404)。
 * Authorization を付けて呼ばれても読まない (ログイン済みでも同じ応答)。
 *
 * 匿名で叩けるので、IP 単位のレート制限 (`PUBLIC_CONTENT_RATE_LIMITER`) で負荷を抑える。
 * 応答はキャッシュさせない (`Cache-Control: no-store`)。印を外して seed したら、その時点で
 * 読めなくなるようにするため (ブラウザーや途中の共有キャッシュに古い本文を残さない)。
 */

import { Hono } from "hono";
import { and, asc, eq, inArray, isNull, ne, notExists, or, sql } from "drizzle-orm";

import type { PublicLesson, PublicLessonType, PublicUnit } from "@stella/shared/cms/types";

import { getDb, type Db } from "../db/client.js";
import { lessons, sections, stages, tasks } from "../db/schema.js";
import { ApiError, errorResponse } from "../lib/authz.js";
import { enforcePublicContentRateLimit } from "../lib/rate-limit.js";
import type { Env } from "../env.js";

export const publicContentRoute = new Hono<{ Bindings: Env }>();

const PUBLIC_LESSON_TYPES: PublicLessonType[] = ["slides", "text"];

/** 公開を止めた本文をキャッシュから読ませない (ファイル冒頭)。 */
const CACHE_CONTROL = "no-store";

function publicTenant(env: Env): string | null {
  return env.PUBLIC_CONTENT_TENANT_ID?.trim() || null;
}

/** 公開してよいレッスンの条件 (ファイル冒頭の一覧)。一覧と本文で同じものを使う。 */
function publicLessonFilter(db: Db, tenantId: string) {
  return and(
    // 部分索引 (lessons_public_idx) を使わせるため、値はバインドせず式に直に書く。
    sql`${lessons.public} = 1`,
    inArray(lessons.type, PUBLIC_LESSON_TYPES),
    ne(lessons.markdown, ""),
    notExists(db.select({ one: sql`1` }).from(tasks).where(eq(tasks.lessonId, lessons.id))),
    eq(stages.tenantId, tenantId),
    eq(stages.status, "published"),
    eq(stages.audience, "catalog"),
    eq(stages.format, 2),
    or(isNull(stages.prerequisites), eq(stages.prerequisites, "[]")),
  );
}

publicContentRoute.get("/api/public/units", async (c) => {
  try {
    const limited = await enforcePublicContentRateLimit(c);
    if (limited) return limited;
    const tenantId = publicTenant(c.env);
    if (!tenantId) return c.json({ units: [] satisfies PublicUnit[] });
    const db = getDb(c.env);
    const rows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        type: lessons.type,
        durationLabel: lessons.durationLabel,
        unitId: sections.id,
        unitTitle: sections.title,
        stageTitle: stages.title,
      })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(publicLessonFilter(db, tenantId))
      .orderBy(asc(stages.slug), asc(sections.order), asc(sections.id), asc(lessons.order));
    const units: PublicUnit[] = [];
    for (const row of rows) {
      let unit = units.at(-1);
      if (unit?.id !== row.unitId) {
        unit = { id: row.unitId, title: row.unitTitle, stage_title: row.stageTitle, lessons: [] };
        units.push(unit);
      }
      unit.lessons.push({
        id: row.id,
        title: row.title,
        type: row.type as PublicLessonType,
        duration_label: row.durationLabel,
      });
    }
    c.header("Cache-Control", CACHE_CONTROL);
    return c.json({ units });
  } catch (err) {
    return errorResponse(c, err);
  }
});

publicContentRoute.get("/api/public/lessons/:id", async (c) => {
  try {
    const limited = await enforcePublicContentRateLimit(c);
    if (limited) return limited;
    const id = c.req.param("id");
    const tenantId = publicTenant(c.env);
    if (!tenantId || !id || id.length > 64) throw new ApiError("レッスンが見つかりません", 404);
    const db = getDb(c.env);
    const rows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        type: lessons.type,
        durationLabel: lessons.durationLabel,
        markdown: lessons.markdown,
        totalPages: lessons.totalPages,
        unitId: sections.id,
        unitTitle: sections.title,
        stageTitle: stages.title,
      })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(and(eq(lessons.id, id), publicLessonFilter(db, tenantId)))
      .limit(1);
    const row = rows[0];
    if (!row?.markdown) throw new ApiError("レッスンが見つかりません", 404);
    const lesson: PublicLesson = {
      id: row.id,
      title: row.title,
      type: row.type as PublicLessonType,
      duration_label: row.durationLabel,
      markdown: row.markdown,
      total_pages: row.totalPages,
      unit_id: row.unitId,
      unit_title: row.unitTitle,
      stage_title: row.stageTitle,
    };
    c.header("Cache-Control", CACHE_CONTROL);
    return c.json({ lesson });
  } catch (err) {
    return errorResponse(c, err);
  }
});
