/**
 * 受講登録まわりの一括読み書きで共有するガードとヘルパ。
 *
 * Phase 3b で一括割当 (`/api/enrollments/bulk` / プリセット適用) は退役したので、
 * 残っているのは **今も使われている 4 つ** だけ:
 *
 *   - `MAX_USER_IDS` … staff の enrollment 一覧が受け取る受講者 id の上限
 *   - `D1_MAX_BOUND_PARAMS` / `rowsPerInsert` / `chunk` … D1 のバインド上限に合わせて
 *     1 文あたりの行数を決める (学習経路の記録・レッスン進捗の upsert が使う)
 *
 * 割当専用だった上限 (ステージ数 / 組数) と、割当対象のテナント突合はここから消した —
 * 呼び出し元が無くなり、「まだ一括割当がある」と読める残骸になっていたため。
 */

/** `userIds` に渡せる受講者 id の上限。 1 リクエストの応答量を抑えるためのガード。 */
export const MAX_USER_IDS = 50;
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
