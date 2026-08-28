/**
 * 横断検索 API (Issue #77) — `GET /api/search?q=...`
 *
 * Topbar の検索ボックスから呼ばれ、 ステージとレッスンをまとめて引く。
 *
 * アプリ層認可 (materials.ts と同基準):
 *   - staff (instructor / admin / platform_admin) … 同テナントの全ステージ
 *   - student … published かつ閲覧可能な enrollment (active / completed) のステージのみ
 *
 * ユーザー (profiles) は検索対象に含めない。 受講者一覧はロールによって遷移先が
 * 定まらず、 管理画面 (`/admin/users`) が専用の検索を持っているため。
 */

import { Hono } from "hono";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import {
  buildLikePattern,
  buildPrefixLikePattern,
  isSearchableQuery,
  normalizeSearchQuery,
  rankSearchResults,
  SEARCH_KIND_LIMIT,
  SEARCH_RESULT_LIMIT,
  type SearchResult,
} from "@falcon/shared/search/types";

import { READABLE_ENROLLMENT_STATUSES } from "@falcon/shared/enrollment/access";

import { stages, enrollments, lessons, sections } from "../db/schema.js";
import { errorResponse, getCaller, isStaffRole } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const searchRoute = new Hono<{ Bindings: Env }>();

/** 空文字 / 空白のみを null に畳む (subtitle の「· 」だけの行を避ける)。 */
const blankToNull = (value: string | null): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * caller が検索してよいステージ ID の集合を返す。
 * staff は同テナントの全ステージ、 受講者は published + 閲覧可能な enrollment のみ。
 * null は「絞り込み不要 (テナント条件のみ)」を意味する。
 */
async function visibleStageIds(db: Db, caller: Caller): Promise<string[] | null> {
  if (isStaffRole(caller.role)) return null;
  const rows = await db
    .select({ stageId: enrollments.stageId })
    .from(enrollments)
    .innerJoin(stages, eq(stages.id, enrollments.stageId))
    .where(
      and(
        eq(enrollments.userId, caller.id),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
        eq(stages.tenantId, caller.tenantId),
        eq(stages.status, "published"),
      ),
    );
  return rows.map((r) => r.stageId);
}

searchRoute.get("/api/search", async (c) => {
  try {
    const { caller, db } = await getCaller(c);

    const query = normalizeSearchQuery(c.req.query("q") ?? "");
    if (!isSearchableQuery(query)) {
      return c.json({ query, results: [] });
    }

    const scopedIds = await visibleStageIds(db, caller);
    // 受講中ステージが 0 件の受講者は、 テナント条件だけで全件返さないよう早期に空を返す。
    if (scopedIds !== null && scopedIds.length === 0) {
      return c.json({ query, results: [] });
    }

    // drizzle の `like` は ESCAPE 句を付けないため、 sql テンプレートで明示する。
    const pattern = buildLikePattern(query);
    const prefix = buildPrefixLikePattern(query);

    const stageScope = scopedIds
      ? inArray(stages.id, scopedIds)
      : eq(stages.tenantId, caller.tenantId);

    const stageRows = await db
      .select({
        id: stages.id,
        title: stages.title,
        category: stages.category,
      })
      .from(stages)
      .where(
        and(
          stageScope,
          or(
            sql`${stages.title} LIKE ${pattern} ESCAPE '\\'`,
            sql`${stages.category} LIKE ${pattern} ESCAPE '\\'`,
            sql`${stages.description} LIKE ${pattern} ESCAPE '\\'`,
          ),
        ),
      )
      // LIMIT で切り落とす前に順序を確定させる (rankSearchResults と同じ優先順位)。
      // そうしないと前方一致が落ちて弱い部分一致だけが返ることがある。
      .orderBy(
        sql`(CASE WHEN ${stages.title} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END)`,
        asc(stages.title),
      )
      .limit(SEARCH_KIND_LIMIT);

    const lessonRows = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        type: lessons.type,
        sectionTitle: sections.title,
        stageId: stages.id,
        stageTitle: stages.title,
      })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(and(stageScope, sql`${lessons.title} LIKE ${pattern} ESCAPE '\\'`))
      .orderBy(
        sql`(CASE WHEN ${lessons.title} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END)`,
        asc(lessons.title),
      )
      .limit(SEARCH_KIND_LIMIT);

    const results: SearchResult[] = [
      ...stageRows.map<SearchResult>((row) => ({
        kind: "stage",
        id: row.id,
        title: row.title,
        subtitle: blankToNull(row.category),
        stage_id: row.id,
        stage_title: row.title,
        lesson_type: null,
      })),
      ...lessonRows.map<SearchResult>((row) => ({
        kind: "lesson",
        id: row.id,
        title: row.title,
        subtitle: blankToNull(
          [row.stageTitle, row.sectionTitle]
            .map((s) => s?.trim())
            .filter(Boolean)
            .join(" · "),
        ),
        stage_id: row.stageId,
        stage_title: row.stageTitle,
        lesson_type: row.type,
      })),
    ];

    return c.json({
      query,
      results: rankSearchResults(results, query).slice(0, SEARCH_RESULT_LIMIT),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
