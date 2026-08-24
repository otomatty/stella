/**
 * 全章の Assignment を集約するルートエントリ。
 *
 * falcon-informal P0 では JavaScript の Ch00–Ch09 と、 言語別ディレクトリ
 * (`_lang/sql/` / `_lang/fe-pseudo/`) を取り込む。
 * Python / PHP / Vitest mutation / ESLint config 課題は本プロジェクトのスコープ外 (将来枠)。
 *
 * `assignmentsByStage` / `assignmentsByChapter` の helper は UI 側の章×ステージ matrix で利用される。
 */

import type { Assignment, Chapter, ChapterId, Stage } from "../types.js";
import { chapters } from "../curriculum/chapters.js";

import { ch00Setup } from "./00-setup/_index.js";
import { ch01Variables } from "./01-variables/_index.js";
import { ch02Numbers } from "./02-numbers/_index.js";
import { ch03Strings } from "./03-strings/_index.js";
import { ch04Arrays } from "./04-arrays/_index.js";
import { ch05Conditionals } from "./05-conditionals/_index.js";
import { ch06Loops } from "./06-loops/_index.js";
import { ch07Functions } from "./07-functions/_index.js";
import { ch08Objects } from "./08-objects/_index.js";
import { ch09HigherOrder } from "./09-higher-order/_index.js";
import { langFePseudoAssignments } from "./_lang/fe-pseudo/_index.js";
import { langSqlAssignments } from "./_lang/sql/_index.js";

export { chapters };

export const assignments: Assignment[] = [
  ...ch00Setup,
  ...ch01Variables,
  ...ch02Numbers,
  ...ch03Strings,
  ...ch04Arrays,
  ...ch05Conditionals,
  ...ch06Loops,
  ...ch07Functions,
  ...ch08Objects,
  ...ch09HigherOrder,
  ...langSqlAssignments,
  ...langFePseudoAssignments,
];

export function findAssignment(id: string): Assignment | undefined {
  return assignments.find((a) => a.id === id);
}

export function findChapter(id: ChapterId): Chapter | undefined {
  return chapters.find((chapter) => chapter.id === id);
}

export function assignmentsByChapter(chapterId: ChapterId): Assignment[] {
  return assignments.filter((a) => a.chapterId === chapterId);
}

export function assignmentsByStage(stage: Stage): Assignment[] {
  return assignments.filter((a) => a.stage === stage);
}
