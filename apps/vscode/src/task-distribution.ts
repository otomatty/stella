import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
} from "node:fs/promises";
import path from "node:path";
import {
  FIXED_START_SUFFIX,
  parsePublicTaskBundle,
  type TaskBundle,
} from "@stella/shared/tasks/catalog";
import { normalizeForHash } from "@stella/shared/tasks/hash";
import { starterCodeHash } from "@stella/shared/tasks/starter-code";
import type { HashedFile } from "@stella/shared/tasks/run-result";
import {
  isSafeRelativePattern,
  parseTaskManifest,
  TASK_MANIFEST_PATH,
  type TaskManifest,
} from "@stella/shared/tasks/manifest";
import type { SupportEvent } from "@stella/shared/tasks/submission";
import {
  createNewFile,
  LIMITS,
  matchEditableFiles,
  matchPatterns,
  readFileInRoot,
  sha256Hex,
} from "./runner/files.js";

/** 通常の配布と、前の実装が壊れていて進めないときの「固定した開始点」(01 §4)。 */
export type TaskVariant = "standard" | "fixed-start";

/**
 * `.stella/distribution.json` は配布した版を控える。
 * `deferred` は古い段階的配布の記録だけを読む。新しい配布では書かない。
 */
interface Receipt {
  taskId: string;
  contentHash: string;
  variant?: "fixed-start";
  /** 古い拡張が後から配るつもりで控えたパス。値は保護ファイルのハッシュか、編集対象なら null。 */
  deferred?: Record<string, HashedFile | null>;
  files?: FileHashes;
  updatingTo?: string;
  updatingEditable?: string[];
  adding?: FileHashes;
}

type FileHashes = Record<string, string>;
const RECEIPT_PATH = ".stella/distribution.json";
const HASH_PATTERN = /^[a-f0-9]{64}$/;

const CONFLICT_REASONS = {
  occupied: "準備先に同じ名前のファイルがあります",
  updated: "教材が更新されています。準備先には前のバージョンの課題があります",
  damaged: "準備先の配布ファイルが不足しているか、通常のファイルではありません",
  unsaved: "課題フォルダーに未保存のファイルがあります",
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
      `${CONFLICT_REASONS[reason]}。受講者のファイルは上書きしません。準備先: ${target}${
        files.length > 0 ? ` (衝突: ${listed}${more})` : ""
      }`,
    );
    this.name = "TaskInstallConflict";
    if (reason === "unsaved") this.message += "。ファイルを保存してから、もう一度開いてください。";
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

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? error.code : undefined;
}

async function info(file: string) {
  try {
    return await lstat(file);
  } catch (err) {
    if (errorCode(err) === "ENOENT") return null;
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
      try {
        await mkdir(current);
        created.push(current);
      } catch (error) {
        if (errorCode(error) !== "EEXIST" || !(await info(current))?.isDirectory()) throw error;
      }
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

async function writeNewFile(base: string, dir: string, name: string, data: Buffer): Promise<void> {
  await assertPlainDirectory(base, dir);
  await createNewFile(path.join(dir, name), data);
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

function isDistributablePath(rel: string): boolean {
  const segments = rel.split("/");
  return (
    isSafeRelativePattern(rel) &&
    !/[*?{}[\]]/.test(rel) &&
    !segments.some((s) => s === "." || ["private", "solution", "variants"].includes(s)) &&
    // `.stella/` は拡張の記録用。配布できるのは task.json だけ。
    (segments[0] !== ".stella" || rel === TASK_MANIFEST_PATH)
  );
}

function assertDistributable(bundle: TaskBundle): string[] {
  const parsed = parseTaskManifest(bundle.manifest);
  if (!parsed.ok || bundle.manifest.id.split("/").length !== 3)
    throw new Error("配布する課題の定義が不正です");
  const paths = Object.keys(bundle.files);
  for (const rel of paths)
    if (!isDistributablePath(rel)) throw new Error(`配布ファイルのパスが不正です: ${rel}`);
  if (bundle.manifest.problems?.length) {
    if (!paths.includes(TASK_MANIFEST_PATH))
      throw new Error("配布する課題に .stella/task.json がありません");
  } else if (!paths.includes("README.md") || !paths.includes(TASK_MANIFEST_PATH))
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
      (await readFileInRoot(root, ".stella/distribution.json", 1024 * 1024)).toString("utf8"),
    );
    if (
      typeof raw === "object" &&
      raw !== null &&
      "taskId" in raw &&
      "contentHash" in raw &&
      typeof raw.taskId === "string" &&
      typeof raw.contentHash === "string" &&
      HASH_PATTERN.test(raw.contentHash)
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

function fileHash(data: Buffer): string {
  return sha256Hex(normalizeForHash(data));
}

function fileHashes(entries: readonly [string, Buffer][]): FileHashes {
  return Object.fromEntries(entries.map(([rel, data]) => [rel, fileHash(data)]));
}

function recordedFiles(raw: unknown): unknown {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "files" in raw) {
    const files = (raw as { files: unknown }).files;
    if (typeof files === "object" && files !== null) return files;
  }
  return raw;
}

function codeHashesOf(raw: unknown): FileHashes | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("codeHashes" in raw))
    return;
  const table = (raw as { codeHashes: unknown }).codeHashes;
  if (typeof table !== "object" || table === null || Array.isArray(table)) return;
  if (Object.values(table).every((hash) => typeof hash === "string" && HASH_PATTERN.test(hash)))
    return table as FileHashes;
}

function isFileHashes(raw: unknown, requiresReadme: boolean): raw is FileHashes {
  return (
    typeof raw === "object" &&
    raw !== null &&
    !Array.isArray(raw) &&
    (!requiresReadme || Object.hasOwn(raw, "README.md")) &&
    Object.hasOwn(raw, TASK_MANIFEST_PATH) &&
    Object.entries(raw).every(
      ([rel, hash]) =>
        isDistributablePath(rel) && typeof hash === "string" && HASH_PATTERN.test(hash),
    )
  );
}

function readBundleEntries(bundle: TaskBundle): [string, Buffer][] {
  return Object.entries(bundle.files).map(([rel, encoded]) => [
    rel,
    Buffer.from(encoded, "base64"),
  ]);
}

/** 配布ファイルと拡張の記録を、準備先からの相対パスとバイト列で並べる。 */
function filesToWrite(
  bundle: TaskBundle,
  variant: TaskVariant,
  now: Date,
): [rel: string, data: Buffer][] {
  const entries = readBundleEntries(bundle);
  const receipt: Receipt = {
    taskId: bundle.manifest.id,
    contentHash: bundle.contentHash,
    ...(variant === "fixed-start" ? { variant } : {}),
    files: fileHashes(entries),
  };
  if (variant === "fixed-start") {
    // 提出は `.stella/support.json` を支援記録に含める。サーバーも受け取りを記録している。
    const support: SupportEvent[] = [
      { kind: "fixed-start", at: now.toISOString(), detail: "固定した開始点から始めた" },
    ];
    entries.push([".stella/support.json", Buffer.from(`${JSON.stringify(support, null, 2)}\n`)]);
  }
  // 配布記録は最後に書く。途中で止まった準備は「配布済み」に見せない。
  entries.push([RECEIPT_PATH, Buffer.from(JSON.stringify(receipt))]);
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

function hasDeferred(receipt: Receipt | "invalid" | undefined): receipt is Receipt {
  return (
    !!receipt &&
    receipt !== "invalid" &&
    !!receipt.deferred &&
    Object.keys(receipt.deferred).length > 0
  );
}

type DeferredBundleSource =
  | TaskBundle
  | ((receipt: { variant?: "fixed-start"; contentHash: string }) => Promise<TaskBundle>);

/**
 * 古い段階的配布が `deferred` に控えたファイルを、今の版の配布物からすべて書き、
 * 記録から `deferred` を外す。控えていなければ何もしない。
 * 手元の編集は上書きしない（配布の更新と同じ照合で、一時ファイルを用意してから置く）。
 *
 * 学習フォルダーから課題フォルダーまでの各要素が普通のフォルダーであることを確かめてから書く。
 * 途中のリンクを realpath で解消すると、学習フォルダーの外へ書いてしまう。
 */
export async function releaseDeferredFiles(
  trainingRoot: string | undefined,
  root: string,
  source: DeferredBundleSource,
  guards: DistributionGuards = {},
): Promise<void> {
  const receipt = await readReceipt(root);
  if (!hasDeferred(receipt)) return;
  if (!trainingRoot) {
    throw new Error("学習フォルダーが分からないため、残りのファイルを書き出せません");
  }
  const base = path.resolve(trainingRoot);
  if (!(await stat(base)).isDirectory()) {
    throw new Error(`学習フォルダーがフォルダーではありません: ${trainingRoot}`);
  }
  // 書き込みの直前にも、待ちのあいだにリンクへ差し替えられていないか確かめる。
  await assertPlainDirectory(base, root);
  const key = await realpath(root);
  await serializeInstallation(key, async () => {
    await assertPlainDirectory(base, root);
    await writeDeferredRelease(base, root, source, guards);
  });
}

async function writeDeferredRelease(
  base: string,
  root: string,
  source: DeferredBundleSource,
  guards: DistributionGuards,
): Promise<void> {
  const receipt = await readReceipt(root);
  if (!hasDeferred(receipt)) return;
  const bundle =
    typeof source === "function"
      ? parsePublicTaskBundle(
          await source({
            contentHash: receipt.contentHash,
            ...(receipt.variant ? { variant: receipt.variant } : {}),
          }),
        )
      : parsePublicTaskBundle(source);
  if (bundle.manifest.id !== receipt.taskId || bundle.contentHash !== receipt.contentHash) return;

  const deferred = receipt.deferred ?? {};
  const entries: [string, Buffer][] = [];
  for (const rel of Object.keys(deferred)) {
    const encoded = bundle.files[rel];
    if (encoded === undefined) throw new TaskInstallConflict("damaged", root, [rel]);
    entries.push([rel, Buffer.from(encoded, "base64")]);
  }
  const released = fileHashes(entries);
  // 同じ版なので、既にあるファイルは受講者の編集として残す（雛形のハッシュを前回値にする）。
  // files の無い古い記録に、書き出した分だけのハッシュを足すと、次の更新が版の照合を飛ばす。
  const recordedFiles = isFileHashes(receipt.files, false) ? receipt.files : undefined;
  const oldFiles = { ...recordedFiles, ...released };
  await guards.beforeUpdate?.(root);
  const writes = await planReplacements(
    root,
    bundle.manifest,
    entries,
    oldFiles,
    backupDirectory(receipt.contentHash),
    { mode: "add", adding: receipt.adding },
  );
  const next: Receipt = {
    taskId: receipt.taskId,
    contentHash: receipt.contentHash,
    ...(receipt.variant ? { variant: receipt.variant } : {}),
    ...(recordedFiles ? { files: { ...recordedFiles, ...released } } : {}),
  };
  await writeDistributionUpdate(
    base,
    root,
    writes,
    receipt,
    next,
    guards,
    entries.length > 0 ? { adding: { ...receipt.adding, ...released } } : undefined,
  );
}

export async function hasDeferredDistribution(root: string): Promise<boolean> {
  return hasDeferred(await readReceipt(root).catch(() => undefined));
}

export function protectedTaskFiles(manifest: TaskManifest, listed: readonly string[]) {
  return { ...matchPatterns(listed, manifest.protected), references: [] as HashedFile[] };
}

interface Replacement {
  rel: string;
  data: Buffer;
  before?: Buffer;
}

interface Retirement {
  rel: string;
  before: Buffer;
  backupRel: string;
  data?: never;
}

type DistributionChange = Replacement | Retirement;

const BACKUP_PREFIX = ".stella/previous/";

async function readExisting(root: string, rel: string): Promise<Buffer | undefined> {
  if ((await collisions(root, [rel])).length === 0) return undefined;
  if (!(await isPlainFile(root, rel))) throw new TaskInstallConflict("damaged", root, [rel]);
  return readFileInRoot(root, rel, LIMITS.protectedFileBytes);
}

async function needsPublication(
  root: string,
  { rel, before, data }: DistributionChange,
): Promise<boolean> {
  const current = await readExisting(root, rel);
  if (data ? current?.equals(data) : current === undefined) return false;
  if (before ? !current?.equals(before) : current !== undefined)
    throw new TaskInstallConflict("occupied", root, [rel]);
  return true;
}

const NO_HARD_LINK = new Set([
  "EPERM",
  "EACCES",
  "ENOSYS",
  "ENOTSUP",
  "EOPNOTSUPP",
  "EXDEV",
  "EMLINK",
]);

async function publishNewFile(root: string, source: string, write: Replacement): Promise<void> {
  const target = path.join(root, write.rel);
  try {
    await link(source, target);
  } catch (error) {
    const code = errorCode(error);
    if (code === "EEXIST") {
      if (await needsPublication(root, write)) throw error;
    } else if (typeof code === "string" && NO_HARD_LINK.has(code)) {
      if (await needsPublication(root, write)) await rename(source, target);
    } else {
      throw error;
    }
  }
}

/** バージョン更新は先に更新先を控え、全ファイルの公開後に配布記録を切り替える。 */
async function writeDistributionUpdate(
  base: string,
  root: string,
  entries: DistributionChange[],
  previous: Receipt,
  receipt: Receipt,
  guards: DistributionGuards,
  progress?: Pick<Receipt, "updatingTo" | "updatingEditable" | "adding">,
): Promise<void> {
  const state = path.join(root, ".stella");
  await assertPlainDirectory(base, state);
  const staging = await mkdtemp(path.join(state, ".distribution-staging-"));
  try {
    const previousRecord = await readExisting(root, RECEIPT_PATH);
    if (!previousRecord) throw new TaskInstallConflict("occupied", root, [RECEIPT_PATH]);
    const pendingRecord = progress ? JSON.stringify({ ...previous, ...progress }) : undefined;
    const marking = pendingRecord !== undefined && pendingRecord !== JSON.stringify(previous);
    const activeRecord = marking ? Buffer.from(pendingRecord) : previousRecord;
    const markerSource = path.join(staging, "updating-receipt");
    if (marking) await writeNewFile(base, staging, path.basename(markerSource), activeRecord);
    const record: Replacement = {
      rel: RECEIPT_PATH,
      data: Buffer.from(JSON.stringify(receipt)),
      before: activeRecord,
    };
    const writes = [...entries, record];
    for (const [i, { data }] of writes.entries())
      if (data) await writeNewFile(base, staging, String(i), data);
    await guards.beforeUpdate?.(root);
    if (JSON.stringify(await readReceipt(root)) !== JSON.stringify(previous))
      throw new TaskInstallConflict("occupied", root, [RECEIPT_PATH]);

    // 一時ファイルを書いている間に保存された場合も、公開を始める前に止める。
    for (const write of entries) await needsPublication(root, write);
    if (marking) {
      await assertPlainDirectory(base, staging);
      const marker = { rel: RECEIPT_PATH, before: previousRecord, data: activeRecord };
      if (await needsPublication(root, marker))
        await rename(markerSource, path.join(root, RECEIPT_PATH));
    }
    for (const [i, write] of writes.entries()) {
      const { rel, before } = write;
      await assertPlainDirectory(base, root);
      const dir = await ensureDirectoryIn(root, rel.split("/").slice(0, -1));
      await assertPlainDirectory(base, dir);
      await assertPlainDirectory(base, staging);
      const source = path.join(staging, String(i));
      const target = path.join(root, rel);
      if (rel !== RECEIPT_PATH) {
        const currentReceipt = await readExisting(root, RECEIPT_PATH);
        if (currentReceipt?.equals(record.data)) return;
        if (!currentReceipt?.equals(activeRecord))
          throw new TaskInstallConflict("occupied", root, [RECEIPT_PATH]);
      }
      if ("backupRel" in write) {
        const backup = await readExisting(root, write.backupRel);
        if (!backup?.equals(write.before))
          throw new TaskInstallConflict("occupied", root, [write.backupRel]);
        await guards.beforeReplace?.(root, rel);
        if (await needsPublication(root, write)) await rm(target);
        continue;
      }
      if (before && rel !== RECEIPT_PATH) await guards.beforeReplace?.(root, rel);
      if (!(await needsPublication(root, write))) continue;
      if (before) {
        await rename(source, target);
      } else {
        await publishNewFile(root, source, write);
      }
    }
  } finally {
    if (await isPlainDirectory(base, staging)) await rm(staging, { recursive: true, force: true });
  }
}

async function verifiedOldManifest(
  root: string,
  oldFiles: FileHashes,
): Promise<TaskManifest | undefined> {
  const rel = TASK_MANIFEST_PATH;
  try {
    const data = await readExisting(root, rel);
    if (data && fileHash(data) === oldFiles[rel]) {
      const parsed = parseTaskManifest(
        JSON.parse(Buffer.from(normalizeForHash(data)).toString("utf8")),
      );
      if (parsed.ok) return parsed.manifest;
    }
  } catch {
    // 照合できない設定からは、以前の編集対象を決めない。
  }
}

async function backupPath(root: string, rel: string, data: Buffer) {
  const suffix = sha256Hex(data).slice(0, 12);
  for (let attempt = 0; ; attempt++) {
    const candidate = attempt === 0 ? rel : `${rel}.${suffix}${attempt === 1 ? "" : `-${attempt}`}`;
    const existing = await readExisting(root, candidate);
    if (!existing || existing.equals(data))
      return { rel: candidate, exists: existing !== undefined };
  }
}

async function planReplacements(
  root: string,
  manifest: TaskManifest,
  entries: [string, Buffer][],
  oldFiles: FileHashes,
  backupDir: string,
  policy:
    | { mode: "update" | "resume"; oldEditable?: readonly string[]; codeHashes?: FileHashes }
    | { mode: "add"; adding?: FileHashes },
): Promise<Replacement[]> {
  const paths = entries.map(([rel]) => rel);
  const editable = new Set(matchEditableFiles(paths, manifest).files);
  if (policy.mode !== "add") for (const rel of policy.oldEditable ?? []) editable.add(rel);

  const clashes: string[] = [];
  const writes: Replacement[] = [];
  // 途中で止まっても、まず古い設定で編集対象を照合できるようにする。
  const ordered = [
    ...entries.filter(([rel]) => rel !== TASK_MANIFEST_PATH),
    ...entries.filter(([rel]) => rel === TASK_MANIFEST_PATH),
  ];
  for (const [rel, data] of ordered) {
    const previousHash = Object.hasOwn(oldFiles, rel) ? oldFiles[rel] : undefined;
    const nextHash = fileHash(data);
    if (editable.has(rel) && previousHash === nextHash && (await isPlainFile(root, rel))) continue;
    const before = await readExisting(root, rel);
    const currentHash = before && fileHash(before);
    if (currentHash === nextHash) continue;
    if (before && policy.mode === "add" && previousHash === undefined) {
      if (editable.has(rel) && policy.adding?.[rel] === nextHash) continue;
      throw new TaskInstallConflict("occupied", root, [rel]);
    }

    if (before && editable.has(rel)) {
      // 更新先を記録したあとに保存されたコードも受講者の編集として残す。
      if (previousHash === nextHash || (policy.mode === "resume" && currentHash !== previousHash))
        continue;
      if (currentHash !== previousHash) {
        const codeHashes = policy.mode === "add" ? undefined : policy.codeHashes;
        if (codeHashes && (await starterCodeHash(data)) === codeHashes[rel]) continue;
        clashes.push(rel);
        continue;
      }
    } else if (before && currentHash !== previousHash) {
      if (policy.mode !== "add" && policy.oldEditable === undefined) {
        clashes.push(rel);
        continue;
      }
      const backup = await backupPath(root, `${backupDir}/${rel}`, before);
      if (!backup.exists) writes.push({ rel: backup.rel, data: before });
    }
    writes.push({ rel, data, before });
  }
  if (clashes.length > 0) throw new TaskInstallConflict("updated", root, clashes);
  return writes;
}

async function planRetirements(
  root: string,
  bundle: TaskBundle,
  oldFiles: FileHashes,
  backupDir: string,
): Promise<DistributionChange[]> {
  const removed = Object.keys(oldFiles).filter((rel) => !Object.hasOwn(bundle.files, rel));
  const retired = matchPatterns(removed, bundle.manifest.protected).files;
  const writes: DistributionChange[] = [];
  for (const rel of retired) {
    const before = await readExisting(root, rel);
    if (!before) continue;
    const backup = await backupPath(root, `${backupDir}/${rel}`, before);
    if (!backup.exists) writes.push({ rel: backup.rel, data: before });
    // 中断しても元の内容が残るよう、写しを公開してから作業ツリーから外す。
    writes.push({ rel, before, backupRel: backup.rel });
  }
  return writes;
}

async function assertDistributionPresent(root: string, paths: readonly string[]): Promise<void> {
  const missing: string[] = [];
  for (const rel of paths) if (!(await isPlainFile(root, rel))) missing.push(rel);
  if (missing.length > 0) throw new TaskInstallConflict("damaged", root, missing);
}

function backupDirectory(contentHash: string): string {
  return `${BACKUP_PREFIX}${contentHash.slice(0, 12)}`;
}

type InstallOptions = {
  variant?: TaskVariant;
  now?: Date;
  loadRevisionFiles?: (taskId: string, contentHash: string) => Promise<unknown>;
  onUpdated?: (backupDir?: string) => void;
} & DistributionGuards;

type DistributionGuards = {
  beforeUpdate?: (root: string) => Promise<void>;
  beforeReplace?: (root: string, rel: string) => Promise<void>;
};

async function updateDistribution(
  base: string,
  root: string,
  bundle: TaskBundle,
  receipt: Receipt,
  options: InstallOptions,
): Promise<void> {
  await options.beforeUpdate?.(root);
  let oldFiles = receipt.files;
  const requiresReadme = !bundle.manifest.problems?.length;
  if (!isFileHashes(oldFiles, requiresReadme)) {
    // 固定した開始点の雛形は通常配布の履歴とは異なる。
    const loaded =
      receipt.variant === "fixed-start"
        ? undefined
        : await options
            .loadRevisionFiles?.(receipt.taskId, receipt.contentHash)
            .catch(() => undefined);
    const files = recordedFiles(loaded);
    if (!isFileHashes(files, requiresReadme))
      throw new TaskInstallConflict("updated", root, await changedFiles(root, bundle));
    oldFiles = files;
  }
  const entries = readBundleEntries(bundle);
  const backupDir = backupDirectory(receipt.contentHash);
  const resume = receipt.updatingTo === bundle.contentHash;
  const oldManifest = await verifiedOldManifest(root, oldFiles);
  const oldEditable = oldManifest
    ? matchEditableFiles(
        entries.map(([rel]) => rel),
        oldManifest,
      ).files
    : resume && Array.isArray(receipt.updatingEditable)
      ? receipt.updatingEditable
      : undefined;
  let writes: Replacement[];
  try {
    writes = await planReplacements(root, bundle.manifest, entries, oldFiles, backupDir, {
      mode: resume ? "resume" : "update",
      oldEditable,
    });
  } catch (error) {
    if (
      !(error instanceof TaskInstallConflict) ||
      error.reason !== "updated" ||
      !options.loadRevisionFiles ||
      receipt.variant === "fixed-start"
    )
      throw error;
    let loaded: unknown;
    try {
      loaded = await options.loadRevisionFiles(receipt.taskId, receipt.contentHash);
    } catch {
      throw error;
    }
    const codeHashes = codeHashesOf(loaded);
    if (!codeHashes) throw error;
    writes = await planReplacements(root, bundle.manifest, entries, oldFiles, backupDir, {
      mode: resume ? "resume" : "update",
      oldEditable,
      codeHashes,
    });
  }
  const retirements = await planRetirements(root, bundle, oldFiles, backupDir);
  await writeDistributionUpdate(
    base,
    root,
    [...retirements, ...writes],
    receipt,
    {
      taskId: receipt.taskId,
      contentHash: bundle.contentHash,
      ...(receipt.variant ? { variant: receipt.variant } : {}),
      files: fileHashes(entries),
    },
    options,
    { updatingTo: bundle.contentHash, updatingEditable: oldEditable, adding: undefined },
  );
  const backup = path.join(root, backupDir);
  options.onUpdated?.((await info(backup))?.isDirectory() ? backup : undefined);
}

const installations = new Map<string, Promise<unknown>>();
const installationQueueWatchers = new Set<(waiting: boolean) => void>();

/** 同じ鍵の配布が待ちに入ったことを、テストが取りこぼさず待つ。 */
export function watchInstallationQueue(listener: (waiting: boolean) => void): () => void {
  installationQueueWatchers.add(listener);
  return () => installationQueueWatchers.delete(listener);
}

/**
 * 同じ課題フォルダーの配布を 1 本ずつ行う。
 * 控えたファイルの書き出しは `installTaskFiles` が `writeDeferredRelease` を直接呼ぶ。
 * ここを入れ子にすると、同じ鍵の待ちが戻ってこなくなる。
 */
async function serializeInstallation<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = installations.get(key);
  const pending = (previous?.catch(() => undefined) ?? Promise.resolve()).then(() => work());
  installations.set(key, pending);
  for (const listener of installationQueueWatchers) listener(previous !== undefined);
  try {
    return await pending;
  } finally {
    if (installations.get(key) === pending) installations.delete(key);
  }
}

export async function installTask(
  trainingRoot: string,
  bundle: TaskBundle,
  options: InstallOptions = {},
) {
  const parsed = parsePublicTaskBundle(bundle);
  const key = path.resolve(
    await realpath(trainingRoot),
    ...taskFolderSegments(parsed.manifest.id, options.variant),
  );
  return serializeInstallation(key, () => installTaskFiles(trainingRoot, parsed, options));
}

/**
 * 課題を学習フォルダーの `<ステージ>/<単元>/<課題>/` (固定した開始点は `<課題>-fixed-start/`) へ
 * 置き、課題フォルダーの絶対パスを返す。
 *
 * - 初めての配布は一時フォルダーで完成させてから名前を付け替える (途中で止まっても半端に残さない)。
 * - 同じバージョンなら、古い段階的配布が控えたファイルを書き出してから、配布ファイルの欠落を確かめる。
 * - 教材が変われば雛形を照合して更新する。
 * - 準備先にファイルがあれば、同じ名前のファイルが無いときだけ横に足す。あれば TaskInstallConflict。
 * - 学習フォルダー自体はリンクの先でもよいが、その中ではリンクをたどらない。
 */
async function installTaskFiles(
  trainingRoot: string,
  bundle: TaskBundle,
  options: InstallOptions,
): Promise<string> {
  const variant = options.variant ?? "standard";
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

  const receipt = rootInfo ? await readReceipt(root) : undefined;
  if (receipt === "invalid")
    throw new TaskInstallConflict("occupied", root, [".stella/distribution.json"]);
  if (receipt) {
    const sameTask =
      receipt.taskId === bundle.manifest.id && (receipt.variant ?? "standard") === variant;
    if (!sameTask) throw new TaskInstallConflict("occupied", root, [".stella/distribution.json"]);
    if (receipt.contentHash !== bundle.contentHash)
      await updateDistribution(base, root, bundle, receipt, options);
    else {
      await writeDeferredRelease(base, root, bundle, options);
      await assertDistributionPresent(root, paths);
    }
    return root;
  }
  const entries = filesToWrite(bundle, variant, options.now ?? new Date());
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
