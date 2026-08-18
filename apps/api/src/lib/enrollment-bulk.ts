/**
 * 受講登録の一括書き込みで共有するガードとヘルパ。
 *
 * `/api/enrollments/bulk` (手動の一括割当) と `/api/enrollment-presets/:id/apply`
 * (割当プリセットの適用) は、 同じ upsert に同じ制約 (D1 のバインド上限 / 1 リクエストの
 * 組数上限 / テナント突合) で乗る。 片方だけ直すと 「bulk は通るが apply は
 * too many SQL variables で落ちる」 のような食い違いが出るため、 1 か所に集める。
 */

import { and, eq, inArray } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { courses, profiles } from "../db/schema.js";
import { ApiError } from "./authz.js";

/** `userIds` に渡せる受講者 id の上限。 1 リクエストの応答量を抑えるためのガード。 */
export const MAX_USER_IDS = 50;
/** 1 リクエストで扱える コース id の上限。 */
export const MAX_COURSE_IDS = 50;
/** 1 リクエストで扱える 受講者 × コース の組み合わせ上限。 */
export const MAX_PAIRS = 500;
/**
 * D1 の 1 クエリあたりのバインド変数上限。 これを超えると
 * `D1_ERROR: too many SQL variables` で失敗するため、 SQL 文をこの範囲に分けて batch で流す。
 */
export const D1_MAX_BOUND_PARAMS = 100;

/**
 * 1 文に載せられる upsert 行数を、 実際に組み立てた SQL のバインド数から求める。
 *
 * 列を数え上げるとズレる (`id` / `enrolled_at` は `$defaultFn` のため、 スキーマ上は既定値でも
 * 値がバインドされる)。 1 行版と 2 行版のバインド数の差を 1 行あたりのコストとして測り、
 * 残りを固定オーバーヘッド (SET 句) とみなす。 スキーマに列が増えても自動で追随する。
 */
export function rowsPerInsert(
  build: (rows: number) => { toSQL: () => { params: unknown[] } },
): number {
  const one = build(1).toSQL().params.length;
  const two = build(2).toSQL().params.length;
  const perRow = Math.max(1, two - one);
  const overhead = Math.max(0, one - perRow);
  return Math.max(1, Math.floor((D1_MAX_BOUND_PARAMS - overhead) / perRow));
}

/** 配列を `size` 件ずつに分ける。 */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += Math.max(1, size)) out.push(items.slice(i, i + size));
  return out;
}

/** 配列を受け取り、 空要素を落として重複を除く (配列以外は空配列)。 */
export function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.trim() !== ""))];
}

/**
 * 割当対象の受講者 / コースが caller と同テナントに実在することを確かめる。
 *
 * enrollments の外部キーは 「存在するか」 しか見ず、 テナントは見ない。 検証せずに insert すると、
 * 他テナントの受講者 / コースを指す行を自テナントの tenant_id で作れてしまい、
 * 受講者本人の一覧 (`/api/enrollments/mine` は user_id だけで引く) に他テナントのコースが出る。
 * また (user_id, course_id) はグローバルに一意なので、 他テナントの既存登録の期限 / 必須を
 * upsert で書き換えられてしまう。
 */
export async function assertTenantTargets(
  db: Db,
  tenantId: string,
  userIds: string[],
  courseIds: string[],
): Promise<void> {
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), inArray(profiles.id, userIds)));
    const found = new Set(rows.map((row) => row.id));
    if (userIds.some((id) => !found.has(id))) {
      throw new ApiError("同じテナントに存在しない受講者が含まれています", 403);
    }
  }
  if (courseIds.length > 0) {
    const rows = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.tenantId, tenantId), inArray(courses.id, courseIds)));
    const found = new Set(rows.map((row) => row.id));
    if (courseIds.some((id) => !found.has(id))) {
      throw new ApiError("同じテナントに存在しないコースが含まれています", 403);
    }
  }
}
