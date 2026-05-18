/**
 * 各トピックファイルで共有するヘルパ。
 */

import type { AssignmentFile } from "../types.js";

export { COMMON_LINT_RULES } from "../lint-presets.js";

/**
 * 単一ファイル課題向けの starterFiles ヘルパ。
 * `starterFiles: singleFile(\`...\`)` の形で書く。
 * JS 以外 (SQL 等) では明示的に `path` を渡す。
 */
export function singleFile(
  content: string,
  path: string = "main.js",
): AssignmentFile[] {
  return [{ path, content }];
}
