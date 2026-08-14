/**
 * SQL 教材の課題集約 (#100 / #109)。
 *
 * JS の章別 (`00-setup` / `01-variables` ...) と並列するスタイルではなく、
 * 言語別ディレクトリ `_lang/sql/` 配下にまとめる (#100 ロードマップの配置方針)。
 * 課題は JS と同じ `Assignment` 型で記述し、 `language: "sql"` で識別される。
 * `chapterId` は SQL 課題でも既存の `Ch00`〜`Ch16` を使う (curriculum/chapters.ts の章定義を共有)。
 */

import type { Assignment } from "../../../types.js";

import { s0SqlCh00SelectHello } from "./Ch00/s0/01-select-hello.js";
import { s0SqlCh00WhereFilter } from "./Ch00/s0/02-where-filter.js";
import { s0SqlCh00GroupBy } from "./Ch00/s0/03-group-by.js";
import { s0SqlCh00SelectColumns } from "./Ch00/s0/04-select-columns.js";
import { s0SqlCh00WhereOnly } from "./Ch00/s0/05-where-only.js";
import { s0SqlCh00OrderLimit } from "./Ch00/s0/06-order-limit.js";
import { s0SqlCh00InnerJoin } from "./Ch00/s0/07-inner-join.js";
import { s0SqlCh00LeftJoin } from "./Ch00/s0/08-left-join.js";
import { s0SqlCh00GroupHaving } from "./Ch00/s0/09-group-having.js";

export const langSqlAssignments: Assignment[] = [
  s0SqlCh00SelectHello,
  s0SqlCh00WhereFilter,
  s0SqlCh00GroupBy,
  s0SqlCh00SelectColumns,
  s0SqlCh00WhereOnly,
  s0SqlCh00OrderLimit,
  s0SqlCh00InnerJoin,
  s0SqlCh00LeftJoin,
  s0SqlCh00GroupHaving,
];
