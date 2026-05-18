/**
 * 後方互換のための再エクスポート shim。
 *
 * 課題定義の本体は `./problems/` 配下に章単位で分割される。
 * クライアントは従来通り `@falcon/shared/assignments` から
 * `assignments` / `chapters` / `findAssignment` などを取得できる。
 */

export {
  assignments,
  chapters,
  findAssignment,
  findChapter,
  assignmentsByChapter,
  assignmentsByStage,
} from "./problems/index.js";
