/**
 * 外部リポジトリの Extra 講座を、stella の作業用の写しの `packages/content` に重ねる。
 *
 * 公開リポジトリの作業フォルダーでは動かさない。入口は
 * `scripts/extra-content.ts` で、リポジトリのルートに `.stella-extra-workspace` が
 * あるときだけ CLI が先へ進む。
 */

import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  type Dirent,
  type Stats,
} from "node:fs";
import { dirname, join, relative } from "node:path";

import { SKILL_MAP_ISLAND_CATEGORIES } from "../../shared/src/skill-map/islands.js";

export const EXTRA_MANIFEST_FILE = "stella-extra.json";
export const EXTRA_WORKSPACE_MARKER = ".stella-extra-workspace";
export const EXTRA_OVERLAY_RECORD = ".extra-overlay.json";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export interface ExtraManifest {
  schemaVersion: 1;
  name: string;
  courses: string[];
}

export interface OverlayResult {
  courses: string[];
  skills: string[];
  patterns: string[];
  sources: string[];
  environments: string[];
}

const WORKSPACE_REQUIRED =
  "この stella は Extra 講座の作業用の写しではありません。外部リポジトリの scripts/stella.mjs が作る写し (.stella/) で実行してください (公開リポジトリの stella に Extra 講座を混ぜないため)";

const ALREADY_OVERLAID = "すでに重ねてあります。作業用の写しを作り直してください。";

const CODING_RULES_AT_ROOT = "コーディング規則は courses/<slug>/coding-rules.md に書いてください。";

/** 作業用の写しでなければ止める。CLI が overlay の前に呼ぶ。 */
export function assertExtraWorkspace(repoRoot: string): void {
  if (!existsSync(join(repoRoot, EXTRA_WORKSPACE_MARKER))) {
    throw new Error(WORKSPACE_REQUIRED);
  }
}

export function readExtraManifest(extraRoot: string): ExtraManifest {
  const path = join(extraRoot, EXTRA_MANIFEST_FILE);
  const raw = readJsonFile(extraRoot, path, EXTRA_MANIFEST_FILE);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${EXTRA_MANIFEST_FILE} はオブジェクトにしてください。`);
  }
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== 1) {
    throw new Error(`${EXTRA_MANIFEST_FILE} の schemaVersion は 1 にしてください。`);
  }
  if (typeof row.name !== "string" || !SLUG_PATTERN.test(row.name)) {
    throw new Error(
      `${EXTRA_MANIFEST_FILE} の name は英小文字・数字・ハイフン (先頭は英小文字か数字) にしてください。`,
    );
  }
  if (!Array.isArray(row.courses) || row.courses.length === 0) {
    throw new Error(`${EXTRA_MANIFEST_FILE} の courses に講座の slug を 1 つ以上書いてください。`);
  }
  const courses: string[] = [];
  for (const slug of row.courses) {
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
      throw new Error(
        `${EXTRA_MANIFEST_FILE} の courses の slug が不正です (${String(slug)})。英小文字・数字・ハイフン (先頭は英小文字か数字) にしてください。`,
      );
    }
    if (courses.includes(slug)) {
      throw new Error(`${EXTRA_MANIFEST_FILE} の courses に slug「${slug}」が重複しています。`);
    }
    courses.push(slug);
  }
  return { schemaVersion: 1, name: row.name, courses };
}

export function overlayExtraContent(input: {
  contentRoot: string;
  extraRoot: string;
}): OverlayResult {
  const { contentRoot, extraRoot } = input;
  if (existsSync(join(contentRoot, EXTRA_OVERLAY_RECORD))) {
    throw new Error(ALREADY_OVERLAID);
  }
  assertNoRootCodingRules(extraRoot);
  const manifest = readExtraManifest(extraRoot);
  const courses = planCourses(contentRoot, extraRoot, manifest);
  const skills = planArrayLedger(contentRoot, extraRoot, "skills.json");
  const patterns = planArrayLedger(contentRoot, extraRoot, "patterns.json");
  const sources = planSourceLedger(contentRoot, extraRoot);
  const environments = planEnvironments(contentRoot, extraRoot);

  for (const slug of courses) {
    copyTree(extraRoot, join(extraRoot, "courses", slug), join(contentRoot, "courses", slug));
  }
  if (skills) writeJson(join(contentRoot, "skills.json"), skills.merged);
  if (patterns) writeJson(join(contentRoot, "patterns.json"), patterns.merged);
  if (sources) writeJson(join(contentRoot, "sources", "registry.json"), sources.merged);
  for (const fileName of environments) {
    const destDir = join(contentRoot, "environments");
    mkdirSync(destDir, { recursive: true });
    copyFileSync(join(extraRoot, "environments", fileName), join(destDir, fileName));
  }

  const result: OverlayResult = {
    courses,
    skills: skills?.added ?? [],
    patterns: patterns?.added ?? [],
    sources: sources?.added ?? [],
    environments: environments.map((fileName) => fileName.replace(/\.json$/, "")),
  };
  writeJson(join(contentRoot, EXTRA_OVERLAY_RECORD), result);
  return result;
}

function planCourses(contentRoot: string, extraRoot: string, manifest: ExtraManifest): string[] {
  const coursesDir = join(extraRoot, "courses");
  const dirStat = lstatOrNull(coursesDir);
  if (!dirStat) {
    throw new Error(
      "courses/ がありません。stella-extra.json の courses に書いた講座のフォルダーを置いてください。",
    );
  }
  if (dirStat.isSymbolicLink()) throw symlinkError(extraRoot, coursesDir);
  if (!dirStat.isDirectory()) throw new Error("courses はフォルダーにしてください。");

  const listed = new Set(manifest.courses);
  const entries = readdirSync(coursesDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const path = join(coursesDir, entry.name);
    if (entry.isSymbolicLink()) throw symlinkError(extraRoot, path);
    if (!listed.has(entry.name)) {
      throw new Error(
        `courses/${entry.name} は stella-extra.json の courses にありません。書くか、フォルダーを除いてください。`,
      );
    }
    if (!entry.isDirectory()) throw new Error(`courses/${entry.name} はフォルダーにしてください。`);
  }
  const names = new Set(entries.map((entry) => entry.name));
  for (const slug of manifest.courses) {
    if (!names.has(slug)) {
      throw new Error(
        `courses/${slug}/course.json がありません。stella-extra.json の courses に書いた講座のフォルダーを courses/ に置いてください。`,
      );
    }
    assertCourse(contentRoot, extraRoot, slug);
  }
  return manifest.courses;
}

function assertCourse(contentRoot: string, extraRoot: string, slug: string): void {
  const courseDir = join(extraRoot, "courses", slug);
  const configPath = join(courseDir, "course.json");
  if (!lstatOrNull(configPath)) {
    throw new Error(
      `courses/${slug}/course.json がありません。stella-extra.json の courses に書いた講座のフォルダーを courses/ に置いてください。`,
    );
  }
  const raw = readJsonFile(extraRoot, configPath, `courses/${slug}/course.json`);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`courses/${slug}/course.json はオブジェクトにしてください。`);
  }
  const config = raw as Record<string, unknown>;
  if (config.audience !== "granted") {
    throw new Error(
      `courses/${slug}/course.json の audience は "granted" にしてください。Extra 講座だけを外部リポジトリに置けます。`,
    );
  }
  if (typeof config.category !== "string" || !SKILL_MAP_ISLAND_CATEGORIES.has(config.category)) {
    const categories = [...SKILL_MAP_ISLAND_CATEGORIES].join("、");
    throw new Error(
      `courses/${slug}/course.json の category は島のカテゴリ (${categories}) のどれかにしてください。新しい島は stella の packages/shared/src/skill-map/islands.ts に足します。`,
    );
  }
  if (lstatOrNull(join(contentRoot, "courses", slug))) {
    throw new Error(
      `courses/${slug} は stella の講座と slug が重なります。別の slug にしてください。`,
    );
  }
  walkFilesOnly(extraRoot, courseDir);
}

interface ArrayLedgerPlan {
  merged: unknown[];
  added: string[];
}

function planArrayLedger(
  contentRoot: string,
  extraRoot: string,
  fileName: string,
): ArrayLedgerPlan | null {
  const extraPath = join(extraRoot, fileName);
  const extraStat = lstatOrNull(extraPath);
  if (!extraStat) return null;
  if (extraStat.isSymbolicLink()) throw symlinkError(extraRoot, extraPath);
  if (!extraStat.isFile()) throw new Error(`${fileName} はファイルにしてください。`);
  const basePath = join(contentRoot, fileName);
  const base = readIdArray(basePath, `packages/content/${fileName}`);
  const extra = readIdArray(extraPath, fileName);
  const baseIds = new Set(base.ids);
  for (const id of extra.ids) {
    if (baseIds.has(id)) {
      throw new Error(
        `${fileName} の id「${id}」は stella の台帳と重なります。別の id にしてください。`,
      );
    }
  }
  return { merged: [...base.rows, ...extra.rows], added: extra.ids };
}

interface SourceLedgerPlan {
  merged: unknown;
  added: string[];
}

function planSourceLedger(contentRoot: string, extraRoot: string): SourceLedgerPlan | null {
  const sourcesDir = join(extraRoot, "sources");
  const dirStat = lstatOrNull(sourcesDir);
  if (!dirStat) return null;
  if (dirStat.isSymbolicLink()) throw symlinkError(extraRoot, sourcesDir);
  if (!dirStat.isDirectory()) throw new Error("sources はフォルダーにしてください。");
  const extraPath = join(sourcesDir, "registry.json");
  if (!lstatOrNull(extraPath)) return null;
  const basePath = join(contentRoot, "sources", "registry.json");
  const base = readSourceRegistry(basePath, "packages/content/sources/registry.json", null);
  const extra = readSourceRegistry(extraPath, "sources/registry.json", extraRoot);
  const baseIds = new Set(base.ids);
  for (const id of extra.ids) {
    if (baseIds.has(id)) {
      throw new Error(
        `sources/registry.json の id「${id}」は stella の台帳と重なります。別の id にしてください。`,
      );
    }
  }
  return {
    merged: { ...base.record, sources: [...base.rows, ...extra.rows] },
    added: extra.ids,
  };
}

function planEnvironments(contentRoot: string, extraRoot: string): string[] {
  const dir = join(extraRoot, "environments");
  const stat = lstatOrNull(dir);
  if (!stat) return [];
  if (stat.isSymbolicLink()) throw symlinkError(extraRoot, dir);
  if (!stat.isDirectory()) throw new Error("environments はフォルダーにしてください。");
  const added: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw symlinkError(extraRoot, path);
    const id = environmentId(entry);
    if (!id) {
      throw new Error(
        `environments/ には <id>.json だけを置いてください (${entry.name})。id は英小文字・数字・ハイフン・ピリオド・アンダースコアです。`,
      );
    }
    if (lstatOrNull(join(contentRoot, "environments", entry.name))) {
      throw new Error(
        `environments/${entry.name} は stella に既にあります。別の id にしてください。`,
      );
    }
    added.push(entry.name);
  }
  return added;
}

function environmentId(entry: Dirent): string | null {
  if (!entry.isFile() || !entry.name.endsWith(".json")) return null;
  const id = entry.name.slice(0, -".json".length);
  return /^[a-z0-9][a-z0-9._-]*$/.test(id) ? id : null;
}

function assertNoRootCodingRules(extraRoot: string): void {
  const path = join(extraRoot, "coding-rules.md");
  const stat = lstatOrNull(path);
  if (!stat) return;
  if (stat.isSymbolicLink()) throw symlinkError(extraRoot, path);
  throw new Error(CODING_RULES_AT_ROOT);
}

function walkFilesOnly(extraRoot: string, dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw symlinkError(extraRoot, path);
    if (entry.isDirectory()) walkFilesOnly(extraRoot, path);
    else if (!entry.isFile()) {
      throw new Error(
        `ファイルとフォルダー以外は取り込めません (${displayPath(extraRoot, path)})。`,
      );
    }
  }
}

function copyTree(extraRoot: string, src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isSymbolicLink()) throw symlinkError(extraRoot, from);
    if (entry.isDirectory()) copyTree(extraRoot, from, to);
    else if (entry.isFile()) copyFileSync(from, to);
    else {
      throw new Error(
        `ファイルとフォルダー以外は取り込めません (${displayPath(extraRoot, from)})。`,
      );
    }
  }
}

function readIdArray(path: string, label: string): { rows: unknown[]; ids: string[] } {
  const value = readJsonFileUnchecked(path, label);
  if (!Array.isArray(value)) throw new Error(`${label} は配列にしてください。`);
  const ids: string[] = [];
  for (const row of value) {
    const id = recordId(row, label);
    if (ids.includes(id)) throw new Error(`${label} の id「${id}」が重複しています。`);
    ids.push(id);
  }
  return { rows: value, ids };
}

function readSourceRegistry(
  path: string,
  label: string,
  linkRoot: string | null,
): { record: Record<string, unknown>; rows: unknown[]; ids: string[] } {
  const value = linkRoot ? readJsonFile(linkRoot, path, label) : readJsonFileUnchecked(path, label);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} はオブジェクトにしてください。`);
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.sources)) {
    throw new Error(`${label} の sources は配列にしてください。`);
  }
  const ids: string[] = [];
  for (const row of record.sources) {
    const id = recordId(row, label);
    if (ids.includes(id)) throw new Error(`${label} の id「${id}」が重複しています。`);
    ids.push(id);
  }
  return { record, rows: record.sources, ids };
}

function recordId(row: unknown, label: string): string {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`${label} の要素は id を持つオブジェクトにしてください。`);
  }
  const id = (row as { id?: unknown }).id;
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(`${label} の要素に id がありません。`);
  }
  return id;
}

function readJsonFile(extraRoot: string, path: string, label: string): unknown {
  const stat = lstatOrNull(path);
  if (!stat) throw new Error(`${label} がありません。`);
  if (stat.isSymbolicLink()) throw symlinkError(extraRoot, path);
  if (!stat.isFile()) throw new Error(`${label} はファイルにしてください。`);
  return parseJson(path, label);
}

/** stella 側の台帳。外部リポジトリの外なので、シンボリックリンクの拒否はしない。 */
function readJsonFileUnchecked(path: string, label: string): unknown {
  if (!existsSync(path)) throw new Error(`${label} がありません。`);
  return parseJson(path, label);
}

function parseJson(path: string, label: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new Error(`${label} の JSON が読めません。`);
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function lstatOrNull(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function displayPath(root: string, path: string): string {
  return relative(root, path).replaceAll("\\", "/");
}

function symlinkError(root: string, path: string): Error {
  return new Error(
    `シンボリックリンクは取り込めません (${displayPath(root, path)})。外部のファイルを取り込まないため、実体のファイルとフォルダーだけを置いてください。`,
  );
}
