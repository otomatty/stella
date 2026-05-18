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

export const langSqlAssignments: Assignment[] = [
  s0SqlCh00SelectHello,
  s0SqlCh00WhereFilter,
  s0SqlCh00GroupBy,
];
