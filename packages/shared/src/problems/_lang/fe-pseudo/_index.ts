/**
 * 擬似言語 (基本情報技術者試験 科目B) 教材の課題集約 (#133)。
 *
 * SQL (`_lang/sql/`) と同じく、 JS の章別ディレクトリと並列にはせず言語別にまとめる。
 * 課題は JS と同じ `Assignment` 型で記述し、 `language: "fe-pseudo"` で識別される。
 * `chapterId` は SQL 課題と同様に既存の `Ch00` を流用する (擬似言語は
 * `curriculum/chapters.ts` の JS 章立てには対応しないため)。
 *
 * 採点は `@stella/code-runner` の `fe-pseudo-runner` が担当し、 擬似言語を JS に
 * 落として QuickJS で実行する。 対応構文は
 * `packages/code-runner/src/fe-pseudo/SYNTAX.md` を参照。
 */

import type { Assignment } from "../../../types.js";

import { s0FePseudoCh00MaxOfTwo } from "./Ch00/s0/01-max-of-two.js";
import { s0FePseudoCh00SumToN } from "./Ch00/s0/02-sum-to-n.js";
import { s0FePseudoCh00ArraySum } from "./Ch00/s0/03-array-sum.js";
import { s0FePseudoCh00MaxIndex } from "./Ch00/s0/04-max-index.js";
import { s0FePseudoCh00LinearSearch } from "./Ch00/s0/05-linear-search.js";
import { s0FePseudoCh00BinarySearch } from "./Ch00/s0/06-binary-search.js";
import { s0FePseudoCh00BubbleSort } from "./Ch00/s0/07-bubble-sort.js";
import { s0FePseudoCh00StackBrackets } from "./Ch00/s0/08-stack-brackets.js";
import { s0FePseudoCh00Factorial } from "./Ch00/s0/09-factorial.js";

export const langFePseudoAssignments: Assignment[] = [
  s0FePseudoCh00MaxOfTwo,
  s0FePseudoCh00SumToN,
  s0FePseudoCh00ArraySum,
  s0FePseudoCh00MaxIndex,
  s0FePseudoCh00LinearSearch,
  s0FePseudoCh00BinarySearch,
  s0FePseudoCh00BubbleSort,
  s0FePseudoCh00StackBrackets,
  s0FePseudoCh00Factorial,
];
