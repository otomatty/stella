import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  FIXED_START_SUFFIX,
  parsePublicTaskBundle,
  type TaskBundle,
} from "@stella/shared/tasks/catalog";
import { isSafeRelativePattern, parseTaskManifest } from "@stella/shared/tasks/manifest";
import type { SupportEvent } from "@stella/shared/tasks/submission";
import { LIMITS, readFileInRoot } from "./runner/files.js";

/** 通常の配布と、前の実装が壊れていて進めないときの「固定した開始点」(01 §4)。 */
export type TaskVariant = "standard" | "fixed-start";

/** `.stella/distribution.json`。提出時に配布した版を照合する (task-submission.ts)。 */
interface Receipt {
  taskId: string;
  contentHash: string;
  variant?: "fixed-start";
}

const CONFLICT_REASONS = {
  occupied: "準備先に同じ名前のファイルがあります",
  updated: "教材が更新されています。準備先には前の版の課題があります",
  damaged: "準備先の配布ファイルが不足しているか、通常のファイルではありません",
} as const;

/**
 * 準備先に学習者のファイルがあり、上書きせずに止めたとき (04 §6)。
 * 拡張は準備先 (`target`) と衝突したファイル (`files`。準備先からの相対パス) を示す。
 */
export class TaskInstallConflict extends Error {
  constructor(
    readonly reason: keyof typeof CONFLICT_REASONS,
    readonly target: string,
    readonly files: string[],
  ) {
    const listed = files.slice(0, 5).join(", ");
    const more = files.length > 5 ? ` ほか ${files.length - 5} 件` : "";
    super(
      `${CONFLICT_REASONS[reason]}。学習者のファイルは上書きしません。準備先: ${target}${
        files.length > 0 ? ` (衝突: ${listed}${more})` : ""
      }`,
    );
    this.name = "TaskInstallConflict";
  }
  get summary(): string {
    return CONFLICT_REASONS[this.reason];
  }
}

/** 学習フォルダーからの課題フォルダーの場所。固定した開始点は元の課題の隣の別フォルダー。 */
export function taskFolderSegments(taskId: string, variant: TaskVariant = "standard"): string[] {
  const segments = taskId.split("/");
  if (variant === "fixed-start") segments[segments.length - 1] += FIXED_START_SUFFIX;
  return segments;
}

async function info(file: string) {
  try {
    return await lstat(file);
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * base (実在するフォルダー) の下に segments のフォルダーを、リンクをたどらずに用意する。
 * 途中にリンクやファイルがあれば止める — 学習フォルダーの外へ書き出さないため。
 * 新しく作ったフォルダーは created に積む (失敗時の片付け用)。
 */
async function ensureDirectoryIn(
  base: string,
  segments: string[],
  created: string[] = [],
): Promise<string> {
  let current = base;
  for (const segment of segments) {
    current = path.join(current, segment);
    const found = await info(current);
    if (!found) {
      await mkdir(current);
      created.push(current);
    } else if (!found.isDirectory() || found.isSymbolicLink()) {
      throw new Error(`配布先に通常のフォルダーが必要です: ${current}`);
    }
  }
  return current;
}

function isInside(dir: string, target: string): boolean {
  const rel = path.relative(dir, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * base から dir までの各フォルダーが、リンクでない本物のフォルダーかを書き込み・削除の直前に
 * 確かめる (realpath でも base の中にあることを確かめる)。準備の途中でフォルダーをリンクに
 * 差し替えられても、学習フォルダーの外を書き換えないため。
 */
async function assertPlainDirectory(base: string, dir: string): Promise<void> {
  const rel = path.relative(base, dir);
  if (!isInside(base, dir)) throw new Error(`配布先が学習フォルダーの外です: ${dir}`);
  let current = base;
  for (const segment of rel ? rel.split(path.sep) : []) {
    current = path.join(current, segment);
    const found = await info(current);
    if (!found?.isDirectory() || found.isSymbolicLink())
      throw new Error(`配布先に通常のフォルダーが必要です: ${current}`);
  }
  const [realBase, realDir] = await Promise.all([realpath(base), realpath(dir)]);
  if (!isInside(realBase, realDir)) throw new Error(`配布先が学習フォルダーの外です: ${dir}`);
}

async function isPlainDirectory(base: string, dir: string): Promise<boolean> {
  return assertPlainDirectory(base, dir).then(
    () => true,
    () => false,
  );
}

/** 新しいファイルとしてだけ作る。既存のファイルにもリンクにも書かない (O_EXCL・O_NOFOLLOW)。 */
const CREATE_NEW =
  constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);

async function writeNewFile(base: string, dir: string, name: string, data: Buffer): Promise<void> {
  await assertPlainDirectory(base, dir);
  await writeFile(path.join(dir, name), data, { flag: CREATE_NEW });
}

/**
 * 課題フォルダーの中の通常のファイルか。途中のフォルダーも最後のファイルもリンクなら false。
 * 課題フォルダーの中を指すリンク (README.md → notes.txt など) も配布物とはみなさない。
 */
async function isPlainFile(root: string, rel: string): Promise<boolean> {
  const segments = rel.split("/");
  let current = root;
  for (let i = 0; i < segments.length; i += 1) {
    current = path.join(current, segments[i]);
    const found = await info(current);
    if (!found || found.isSymbolicLink()) return false;
    if (i === segments.length - 1 ? !found.isFile() : !found.isDirectory()) return false;
  }
  return true;
}

function assertDistributable(bundle: TaskBundle): string[] {
  const parsed = parseTaskManifest(bundle.manifest);
  if (!parsed.ok || bundle.manifest.id.split("/").length !== 3)
    throw new Error("配布する課題の定義が不正です");
  const paths = Object.keys(bundle.files);
  for (const rel of paths) {
    const segments = rel.split("/");
    if (
      !isSafeRelativePattern(rel) ||
      /[*?{}[\]]/.test(rel) ||
      segments.some((s) => s === "." || ["private", "solution", "variants"].includes(s)) ||
      // `.stella/` の中は拡張の記録 (配布記録・支援・実行結果)。配布できるのは task.json だけ。
      (segments[0] === ".stella" && rel !== ".stella/task.json")
    )
      throw new Error(`配布ファイルのパスが不正です: ${rel}`);
  }
  if (!paths.includes("README.md") || !paths.includes(".stella/task.json"))
    throw new Error("配布する課題に README.md と .stella/task.json がありません");
  return paths;
}

async function readReceipt(root: string): Promise<Receipt | "invalid" | undefined> {
  const stateInfo = await info(path.join(root, ".stella"));
  if (stateInfo?.isSymbolicLink())
    throw new Error(`配布先に通常のフォルダーが必要です: ${path.join(root, ".stella")}`);
  // `.stella` がファイルなら記録は無い。配布するパスとの衝突として下で示す。
  if (stateInfo && !stateInfo.isDirectory()) return undefined;
  const receiptInfo = await info(path.join(root, ".stella", "distribution.json"));
  if (!receiptInfo) return undefined;
  if (!receiptInfo.isFile()) return "invalid";
  try {
    const raw: unknown = JSON.parse(
      (await readFileInRoot(root, ".stella/distribution.json", 4096)).toString("utf8"),
    );
    if (
      typeof raw === "object" &&
      raw !== null &&
      "taskId" in raw &&
      "contentHash" in raw &&
      typeof raw.taskId === "string" &&
      typeof raw.contentHash === "string"
    )
      return raw as Receipt;
  } catch {
    // 読めない記録は、下で「準備先に別のファイルがある」として扱う。
  }
  return "invalid";
}

/** 配布したいファイルのうち、準備先に何か (ファイル・フォルダー・リンク) があるもの。 */
async function collisions(root: string, paths: string[]): Promise<string[]> {
  const clashes: string[] = [];
  for (const rel of paths) {
    const segments = rel.split("/");
    for (let i = 0; i < segments.length; i += 1) {
      const found = await info(path.join(root, ...segments.slice(0, i + 1)));
      if (!found) break;
      const last = i === segments.length - 1;
      if (last || !found.isDirectory() || found.isSymbolicLink()) {
        clashes.push(last ? rel : segments.slice(0, i + 1).join("/"));
        break;
      }
    }
  }
  return [...new Set(clashes)];
}

/** 新しい版で中身が変わるファイルのうち、準備先にあるもの (学習者が編集した可能性がある)。 */
async function changedFiles(root: string, bundle: TaskBundle): Promise<string[]> {
  const changed: string[] = [];
  for (const [rel, encoded] of Object.entries(bundle.files)) {
    if ((await collisions(root, [rel])).length === 0) continue;
    if (!(await isPlainFile(root, rel))) {
      changed.push(rel);
      continue;
    }
    try {
      const current = await readFileInRoot(root, rel, LIMITS.protectedFileBytes);
      if (!current.equals(Buffer.from(encoded, "base64"))) changed.push(rel);
    } catch {
      changed.push(rel);
    }
  }
  return changed;
}

/** 配布ファイルと拡張の記録を、準備先からの相対パスとバイト列で並べる。 */
function filesToWrite(
  bundle: TaskBundle,
  variant: TaskVariant,
  now: Date,
): [rel: string, data: Buffer][] {
  const receipt: Receipt = {
    taskId: bundle.manifest.id,
    contentHash: bundle.contentHash,
    ...(variant === "fixed-start" ? { variant } : {}),
  };
  const entries: [string, Buffer][] = Object.entries(bundle.files).map(([rel, encoded]) => [
    rel,
    Buffer.from(encoded, "base64"),
  ]);
  if (variant === "fixed-start") {
    // 提出は `.stella/support.json` を支援記録に含める。サーバーも受け取りを記録している。
    const support: SupportEvent[] = [
      { kind: "fixed-start", at: now.toISOString(), detail: "固定した開始点から始めた" },
    ];
    entries.push([".stella/support.json", Buffer.from(`${JSON.stringify(support, null, 2)}\n`)]);
  }
  // 配布記録は最後に書く。途中で止まった準備は「配布済み」に見せない。
  entries.push([".stella/distribution.json", Buffer.from(JSON.stringify(receipt))]);
  return entries;
}

/**
 * 既存の (空でない) 課題フォルダーに、同じ名前のファイルが無いと確かめたうえで足す。
 * フォルダーを先にそろえ、ファイルは 1 つずつ書く直前にフォルダーの並びを確かめ直して
 * 新規作成だけで書く。失敗したら自分が作ったものだけを、学習フォルダーの中に限って片付ける。
 */
async function installBeside(
  base: string,
  root: string,
  entries: [string, Buffer][],
): Promise<void> {
  const createdFiles: string[] = [];
  const createdDirs: string[] = [];
  try {
    const targets: [dir: string, name: string, data: Buffer][] = [];
    for (const [rel, data] of entries) {
      const segments = rel.split("/");
      const dir = await ensureDirectoryIn(root, segments.slice(0, -1), createdDirs);
      targets.push([dir, segments[segments.length - 1], data]);
    }
    for (const [dir, name, data] of targets) {
      await writeNewFile(base, dir, name, data);
      createdFiles.push(path.join(dir, name));
    }
  } catch (error) {
    // リンクに差し替えられたフォルダーの先は消さない (学習フォルダーの外かもしれない)。
    for (const file of createdFiles.reverse())
      if (await isPlainDirectory(base, path.dirname(file))) await rm(file, { force: true });
    for (const dir of createdDirs.reverse())
      if (await isPlainDirectory(base, dir)) await rmdir(dir).catch(() => undefined);
    throw error;
  }
}

/**
 * 課題を学習フォルダーの `<講座>/<単元>/<課題>/` (固定した開始点は `<課題>-fixed-start/`) へ
 * 置き、課題フォルダーの絶対パスを返す。学習者のファイルは上書きしない。
 *
 * - 初めての配布は一時フォルダーで完成させてから名前を付け替える (途中で止まっても半端に残さない)。
 * - 同じ版をもう一度開くときは何も書かずに返す。
 * - 準備先にファイルがあれば、同じ名前のファイルが無いときだけ横に足す。あれば TaskInstallConflict。
 * - 学習フォルダー自体はリンクの先でもよいが、その中ではリンクをたどらない。
 */
export async function installTask(
  trainingRoot: string,
  raw: TaskBundle,
  options: { variant?: TaskVariant; now?: Date } = {},
): Promise<string> {
  const variant = options.variant ?? "standard";
  const bundle = parsePublicTaskBundle(raw);
  const paths = assertDistributable(bundle);
  // 学習フォルダー自体は受講者が選んだ場所 (リンクの先でもよい)。返すパスもこの表記にそろえ、
  // ワークスペースのフォルダーとの比較がずれないようにする。中ではリンクをたどらない。
  const base = path.resolve(trainingRoot);
  if (!(await stat(base)).isDirectory())
    throw new Error(`学習フォルダーがフォルダーではありません: ${trainingRoot}`);
  const segments = taskFolderSegments(bundle.manifest.id, variant);
  const parent = await ensureDirectoryIn(base, segments.slice(0, -1));
  const root = path.join(parent, segments[segments.length - 1]);
  const rootInfo = await info(root);
  if (rootInfo && (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()))
    throw new Error(`配布先に通常のフォルダーが必要です: ${root}`);
  const entries = filesToWrite(bundle, variant, options.now ?? new Date());

  const receipt = rootInfo ? await readReceipt(root) : undefined;
  if (receipt === "invalid")
    throw new TaskInstallConflict("occupied", root, [".stella/distribution.json"]);
  if (receipt) {
    const sameTask =
      receipt.taskId === bundle.manifest.id && (receipt.variant ?? "standard") === variant;
    if (!sameTask) throw new TaskInstallConflict("occupied", root, [".stella/distribution.json"]);
    if (receipt.contentHash !== bundle.contentHash)
      throw new TaskInstallConflict("updated", root, await changedFiles(root, bundle));
    const missing: string[] = [];
    for (const rel of paths) if (!(await isPlainFile(root, rel))) missing.push(rel);
    if (missing.length > 0) throw new TaskInstallConflict("damaged", root, missing);
    return root;
  }
  if (rootInfo && (await readdir(root)).length > 0) {
    const clashes = await collisions(
      root,
      entries.map(([rel]) => rel),
    );
    if (clashes.length > 0) throw new TaskInstallConflict("occupied", root, clashes);
    await installBeside(base, root, entries);
    return root;
  }
  // 同じ親の下で組み立て、完成したディレクトリだけを rename で公開する。
  // 終了や書き込み失敗で一時ファイルが残っても、次回の配布先とは衝突しない。
  const staging = await mkdtemp(path.join(parent, ".stella-task-"));
  try {
    for (const [rel, data] of entries) {
      const parts = rel.split("/");
      const dir = await ensureDirectoryIn(staging, parts.slice(0, -1));
      await writeNewFile(base, dir, parts[parts.length - 1], data);
    }
    // 公開の直前にも、親のフォルダーがリンクに差し替えられていないか確かめる。
    await assertPlainDirectory(base, staging);
    // Windows でも rename できるよう空の既存フォルダーだけを除く。
    // 配布中にファイルが追加された場合は rmdir が失敗し、そのファイルを保持する。
    if (rootInfo) await rmdir(root);
    await rename(staging, root);
    return root;
  } finally {
    if (await isPlainDirectory(base, parent)) await rm(staging, { recursive: true, force: true });
  }
}
