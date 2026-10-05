/**
 * 提出ファイル・配布ファイルを集め、内容ハッシュを取る。
 *
 * 課題フォルダーを歩くときは node_modules や .git に入らず、シンボリックリンクも
 * たどらない。読むのは glob に当たったファイルだけにする (今の採点のように
 * フォルダーの全ファイルを読むと、node_modules があるだけで全部を送ってしまう)。
 */

import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeForHash } from "@stella/shared/tasks/hash";
import { TASK_STATE_DIR } from "@stella/shared/tasks/manifest";
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
  /** 配布ファイル (ハッシュを取るだけで送らない) の 1 ファイルの上限。lockfile も収まる大きさ。 */
  protectedFileBytes: 10 * 1024 * 1024,
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

/** 課題フォルダーの外を指すパス・シンボリックリンク・通常のファイルでないものを読もうとした。 */
export class UnsafePathError extends Error {}

/** 読もうとしたファイルが上限より大きい。 */
export class FileTooLargeError extends Error {}

function isInside(root: string, file: string): boolean {
  const rel = path.relative(root, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * 課題フォルダーの中にある通常のファイルの場所を確かめる。シンボリックリンクと、
 * 途中のフォルダーのリンクで課題フォルダーの外に出るパスは受け付けない。
 * 信頼していないフォルダーでも動く HTML の確認から、外のファイルを読ませないため。
 */
export async function resolveFileInRoot(root: string, rel: string): Promise<string> {
  const file = path.resolve(root, ...rel.split("/"));
  if (!isInside(path.resolve(root), file))
    throw new UnsafePathError(`${rel} は課題フォルダーの外です`);
  const info = await lstat(file);
  if (!info.isFile()) throw new UnsafePathError(`${rel} は通常のファイルではありません`);
  const [realRoot, realFile] = await Promise.all([realpath(root), realpath(file)]);
  if (!isInside(realRoot, realFile)) throw new UnsafePathError(`${rel} は課題フォルダーの外です`);
  return file;
}

/** 課題フォルダーの中にある通常のファイルなら true (無い・リンク・外なら false)。 */
export async function isFileInRoot(root: string, rel: string): Promise<boolean> {
  try {
    await resolveFileInRoot(root, rel);
    return true;
  } catch {
    return false;
  }
}

/**
 * 課題フォルダーの中にある通常のファイルを読む。確かめてから開くまでの間に
 * リンクへ差し替えられても追わないよう、使える OS では O_NOFOLLOW で開く。
 * maxBytes を超えるファイルは読み込まずに FileTooLargeError を投げる。
 */
export async function readFileInRoot(
  root: string,
  rel: string,
  maxBytes: number = Number.POSITIVE_INFINITY,
): Promise<Buffer> {
  const file = await resolveFileInRoot(root, rel);
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile()) {
      throw new UnsafePathError(`${rel} は通常のファイルではありません`);
    }
    if (info.size > maxBytes) {
      throw new FileTooLargeError(`${rel} が大きすぎます (${maxBytes / (1024 * 1024)}MB まで)`);
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

export async function hashFile(root: string, rel: string, maxBytes?: number): Promise<HashedFile> {
  const bytes = await readFileInRoot(root, rel, maxBytes);
  return { path: rel, sha256: sha256Hex(normalizeForHash(bytes)), bytes: bytes.byteLength };
}

/** 1 件ずつ順に読む。同時に読むと、大きなファイルが並んだときにメモリを使い切る。 */
export async function hashFiles(
  root: string,
  files: readonly string[],
  maxBytes: number,
): Promise<HashedFile[]> {
  const hashed: HashedFile[] = [];
  for (const rel of files) hashed.push(await hashFile(root, rel, maxBytes));
  return hashed;
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
    const size = (await lstat(await resolveFileInRoot(root, rel))).size;
    total += size;
    if (size > LIMITS.fileBytes) problems.push({ path: rel, reason: "too-large" });
  }
  return {
    problems,
    tooMany: files.length > LIMITS.submitFiles,
    totalTooLarge: total > LIMITS.totalBytes,
  };
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/** `.stella/` が課題フォルダーの中の本物のフォルダーであることを確かめる (無ければ作る)。 */
async function ensureStateDir(root: string): Promise<string> {
  const dir = path.join(root, TASK_STATE_DIR);
  let info: Awaited<ReturnType<typeof lstat>> | undefined;
  try {
    info = await lstat(dir);
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
  }
  if (!info) {
    await mkdir(dir);
  } else if (!info.isDirectory()) {
    // lstat なので、リンクはフォルダーを指していてもここに来る。
    throw new UnsafePathError(`${TASK_STATE_DIR} がフォルダーではありません (リンクは使えません)`);
  }
  const [realRoot, realDir] = await Promise.all([realpath(root), realpath(dir)]);
  if (!isInside(realRoot, realDir)) {
    throw new UnsafePathError(`${TASK_STATE_DIR} が課題フォルダーの外を指しています`);
  }
  return dir;
}

/**
 * 拡張の状態ファイル (`.stella/<name>`) を書く。信頼していないフォルダーでも HTML の確認は
 * 結果を残すので、置かれていたリンクをたどって課題フォルダーの外を書き換えないようにする。
 * 新しいファイルを `wx` (O_EXCL。リンクも既存とみなして失敗する) で作ってから名前を付け替える。
 * 付け替えは置き換え先がリンクでもリンクそのものを置き換え、リンク先には書かない。
 * keepExisting なら、すでに何か (リンクを含む) があれば何もしない。
 */
export async function writeStateFile(
  root: string,
  name: string,
  content: string,
  options: { keepExisting?: boolean } = {},
): Promise<void> {
  const dir = await ensureStateDir(root);
  const file = path.join(dir, name);
  if (options.keepExisting) {
    try {
      await writeFile(file, content, { flag: "wx" });
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
    return;
  }
  const temp = path.join(dir, `.${name}.${randomUUID()}.tmp`);
  await writeFile(temp, content, { flag: "wx" });
  try {
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

/** コマンドに渡すときの相対パス。`-` で始まる名前がオプションと読まれないよう `./` を付ける。 */
export function asCliPath(rel: string): string {
  return `./${rel}`;
}
