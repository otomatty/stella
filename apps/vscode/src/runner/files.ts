/**
 * 提出ファイル・配布ファイルを集め、内容ハッシュを取る。
 *
 * 課題フォルダーを歩くときは node_modules や .git に入らず、シンボリックリンクも
 * たどらない。読むのは glob に当たったファイルだけにする (今の採点のように
 * フォルダーの全ファイルを読むと、node_modules があるだけで全部を送ってしまう)。
 */

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { normalizeForHash } from "@stella/shared/tasks/hash";
import type { HashedFile } from "@stella/shared/tasks/run-result";
import picomatch from "picomatch";

/** 歩かないディレクトリ。依存パッケージ・履歴・拡張の作業場所・生成物。 */
export const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  ".stella",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
]);

export const LIMITS = {
  /** 歩くファイルの上限。超えたら課題フォルダーの置き方がおかしい。 */
  walkedFiles: 5000,
  /** 提出できるファイル数・1 ファイル・合計の上限。 */
  submitFiles: 50,
  fileBytes: 1024 * 1024,
  totalBytes: 5 * 1024 * 1024,
} as const;

export class TooManyFilesError extends Error {}

/** 課題フォルダー内のファイルを、`/` 区切りの相対パスで返す。 */
export async function listFiles(
  root: string,
  limit: number = LIMITS.walkedFiles,
): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) await walk(path.join(dir, entry.name), rel);
      } else if (entry.isFile()) {
        found.push(rel);
        if (found.length > limit) throw new TooManyFilesError(`ファイルが ${limit} 件を超えました`);
      }
    }
  }
  await walk(root, "");
  return found;
}

export interface MatchResult {
  files: string[];
  /** どのファイルにも当たらなかった glob。 */
  unmatched: string[];
}

export function matchPatterns(files: readonly string[], patterns: readonly string[]): MatchResult {
  const matched = new Set<string>();
  const unmatched: string[] = [];
  for (const pattern of patterns) {
    const isMatch = picomatch(pattern, { dot: true });
    const hits = files.filter((file) => isMatch(file));
    if (hits.length === 0) unmatched.push(pattern);
    for (const hit of hits) matched.add(hit);
  }
  return { files: [...matched].sort(), unmatched };
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function hashFile(root: string, rel: string): Promise<HashedFile> {
  const bytes = await readFile(path.join(root, ...rel.split("/")));
  return { path: rel, sha256: sha256Hex(normalizeForHash(bytes)), bytes: bytes.byteLength };
}

export interface SizeProblem {
  path: string;
  reason: "too-large";
}

/** 提出の上限を確かめる。超えたファイルの一覧を返す (空なら問題なし)。 */
export async function checkSubmitSizes(
  root: string,
  files: readonly string[],
): Promise<{ problems: SizeProblem[]; tooMany: boolean; totalTooLarge: boolean }> {
  const problems: SizeProblem[] = [];
  let total = 0;
  for (const rel of files) {
    const size = (await stat(path.join(root, ...rel.split("/")))).size;
    total += size;
    if (size > LIMITS.fileBytes) problems.push({ path: rel, reason: "too-large" });
  }
  return {
    problems,
    tooMany: files.length > LIMITS.submitFiles,
    totalTooLarge: total > LIMITS.totalBytes,
  };
}

/** コマンドに渡すときの相対パス。`-` で始まる名前がオプションと読まれないよう `./` を付ける。 */
export function asCliPath(rel: string): string {
  return `./${rel}`;
}
