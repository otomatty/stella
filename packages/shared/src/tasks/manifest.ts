/**
 * 受講者の作業フォルダーに置く課題の定義 (`<課題フォルダー>/.stella/task.json`)。
 *
 * 教材側の task.json (課題文・ルーブリック・ヒントなどを含む全体) のうち、
 * 手元での実行と提出に要る部分だけを写したもの。拡張はこのファイルを見つけた
 * フォルダーを「課題のルート」として扱い、runnerId の固定手順で実行する。
 *
 * パスと glob はすべて課題のルートからの相対パスで、`/` 区切りに限る。ルートの外を
 * 指す書き方 (絶対パス・`..`) は受け付けない — 提出で読むファイルを課題の中に閉じる。
 */

import { type EnvironmentRequirement, validateEnvironmentRequirement } from "./environment.js";
import { parsePublicSourceReferences, type PublicSourceReference } from "./source-reference.js";
import { isRunnerId, RUNNER_IDS, type RunnerId } from "./runners.js";

/** 課題フォルダーの中で、拡張が使うディレクトリ。 */
export const TASK_STATE_DIR = ".stella";
/** 課題の定義ファイル (課題フォルダーからの相対パス)。 */
export const TASK_MANIFEST_PATH = `${TASK_STATE_DIR}/task.json`;

export const TASK_KINDS = [
  "basic",
  "connection",
  "independent",
  "debug",
  "integration",
  "assessment-a",
  "assessment-b",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABELS: Readonly<Record<TaskKind, string>> = {
  basic: "基礎",
  connection: "接続",
  independent: "自力",
  debug: "修正",
  integration: "統合",
  "assessment-a": "確認A",
  "assessment-b": "確認B",
};

/**
 * HTML の確認 (static-preview) で使う検査。Node.js を入れる前でも拡張の中だけで
 * 判定できるよう、タグ名とファイルの有無で書ける形に絞っている。
 */
export type StaticCheck =
  | { type: "file-exists"; path: string; name?: string }
  | { type: "html-document"; path: string; name?: string }
  | {
      type: "element-text";
      path: string;
      tag: string;
      text: string;
      match?: "exact" | "contains";
      name?: string;
    }
  | { type: "element-count"; path: string; tag: string; min?: number; max?: number; name?: string }
  | { type: "links-resolve"; path: string; name?: string }
  | { type: "stylesheet-linked"; path: string; href: string; name?: string };

export const STATIC_CHECK_TYPES = [
  "file-exists",
  "html-document",
  "element-text",
  "element-count",
  "links-resolve",
  "stylesheet-linked",
] as const satisfies readonly StaticCheck["type"][];

export interface TaskManifest {
  schemaVersion: 1;
  /** `<講座slug>/<単元>/<課題>`。短い番号だけで結果を保存しない (docs/curriculum/04 §3)。 */
  id: string;
  title: string;
  kind: TaskKind;
  runner: RunnerId;
  submit: {
    /** 提出するファイルの glob。提出と採点で読むのはここに当たるファイルだけ。 */
    files: string[];
  };
  /** 配布したテスト・設定の glob。内容ハッシュを結果に添え、改変を照合する。 */
  protected: string[];
  /** 手元の実行で lint と整形の検査もするか。道具は課題の配布ファイルが持つ。 */
  checks: { lint: boolean; format: boolean };
  references?: PublicSourceReference[];
  environment?: EnvironmentRequirement;
  static?: { checks: StaticCheck[] };
}

export type ParseTaskManifestResult =
  | { ok: true; manifest: TaskManifest }
  | { ok: false; errors: string[] };

const ID_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;
const TAG_NAME = /^[a-z][a-z0-9-]*$/;

/**
 * 課題のルートの中を指す相対パスか (glob の文字は許す)。
 * 絶対パス・ドライブ文字・`..`・`\`・否定パターン (`!`) は受け付けない。
 */
export function isSafeRelativePattern(pattern: string): boolean {
  if (pattern.length === 0 || pattern.length > 300) return false;
  if (pattern.includes("\0") || pattern.includes("\\")) return false;
  if (pattern.startsWith("/") || pattern.startsWith("!")) return false;
  if (/^[A-Za-z]:/.test(pattern)) return false;
  return pattern.split("/").every((segment) => segment !== ".." && segment !== "");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPatterns(raw: unknown, at: string, errors: string[]): string[] {
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    errors.push(`${at} は文字列の配列で書いてください`);
    return [];
  }
  const patterns = raw as string[];
  for (const pattern of patterns) {
    if (!isSafeRelativePattern(pattern)) {
      errors.push(`${at} の "${pattern}" は課題フォルダーからの相対パスで書いてください`);
    }
  }
  return patterns;
}

function validateStaticCheck(raw: unknown, at: string, errors: string[]): void {
  if (!isObject(raw)) {
    errors.push(`${at} はオブジェクトで書いてください`);
    return;
  }
  const type = raw.type;
  if (typeof type !== "string" || !(STATIC_CHECK_TYPES as readonly string[]).includes(type)) {
    errors.push(`${at}.type は ${STATIC_CHECK_TYPES.join(" / ")} のどれかにしてください`);
    return;
  }
  if (
    typeof raw.path !== "string" ||
    !isSafeRelativePattern(raw.path) ||
    /[*?{}[\]]/.test(raw.path)
  ) {
    errors.push(`${at}.path は課題フォルダーからの相対パスで書いてください (glob は使えません)`);
  }
  if (raw.name !== undefined && typeof raw.name !== "string") {
    errors.push(`${at}.name は文字列で書いてください`);
  }
  if (type === "element-text" || type === "element-count") {
    if (typeof raw.tag !== "string" || !TAG_NAME.test(raw.tag)) {
      errors.push(`${at}.tag は小文字のタグ名で書いてください (例 "h1")`);
    }
  }
  if (type === "element-text") {
    if (typeof raw.text !== "string" || raw.text.length === 0) {
      errors.push(`${at}.text は空でない文字列で書いてください`);
    }
    if (raw.match !== undefined && raw.match !== "exact" && raw.match !== "contains") {
      errors.push(`${at}.match は "exact" か "contains" にしてください`);
    }
  }
  if (type === "element-count") {
    for (const key of ["min", "max"] as const) {
      const value = raw[key];
      if (
        value !== undefined &&
        (typeof value !== "number" || !Number.isInteger(value) || value < 0)
      ) {
        errors.push(`${at}.${key} は 0 以上の整数で書いてください`);
      }
    }
    if (raw.min === undefined && raw.max === undefined) {
      errors.push(`${at} には min か max のどちらかが要ります`);
    }
  }
  if (type === "stylesheet-linked" && (typeof raw.href !== "string" || raw.href.length === 0)) {
    errors.push(`${at}.href は空でない文字列で書いてください`);
  }
}

/** task.json の中身 (JSON.parse 済み) を検証して、既定値を埋めた定義を返す。 */
export function parseTaskManifest(raw: unknown): ParseTaskManifestResult {
  if (!isObject(raw)) return { ok: false, errors: ["task.json はオブジェクトで書いてください"] };
  const errors: string[] = [];

  if (raw.schemaVersion !== 1) errors.push("schemaVersion は 1 にしてください");

  const id = raw.id;
  if (
    typeof id !== "string" ||
    id.split("/").length < 2 ||
    !id.split("/").every((s) => ID_SEGMENT.test(s))
  ) {
    errors.push(
      'id は "<講座slug>/<単元>/<課題>" の形 (英小文字・数字・ハイフン) で書いてください',
    );
  }
  if (typeof raw.title !== "string" || raw.title.trim().length === 0) {
    errors.push("title は空でない文字列で書いてください");
  }
  if (typeof raw.kind !== "string" || !(TASK_KINDS as readonly string[]).includes(raw.kind)) {
    errors.push(`kind は ${TASK_KINDS.join(" / ")} のどれかにしてください`);
  }
  if (!isRunnerId(raw.runner)) {
    errors.push(`runner は ${RUNNER_IDS.join(" / ")} のどれかにしてください`);
  }

  let submitFiles: string[] = [];
  if (!isObject(raw.submit)) {
    errors.push("submit はオブジェクトで書いてください");
  } else {
    submitFiles = readPatterns(raw.submit.files, "submit.files", errors);
    if (submitFiles.length === 0 && raw.runner !== "env-diagnose") {
      errors.push("submit.files に提出するファイルを 1 つ以上書いてください");
    }
  }

  const protectedPatterns =
    raw.protected === undefined ? [] : readPatterns(raw.protected, "protected", errors);

  let checks = { lint: false, format: false };
  if (raw.checks !== undefined) {
    if (!isObject(raw.checks)) {
      errors.push("checks はオブジェクトで書いてください");
    } else {
      for (const key of ["lint", "format"] as const) {
        if (raw.checks[key] !== undefined && typeof raw.checks[key] !== "boolean") {
          errors.push(`checks.${key} は true / false で書いてください`);
        }
      }
      checks = { lint: raw.checks.lint === true, format: raw.checks.format === true };
    }
  }

  if (raw.environment !== undefined) {
    errors.push(...validateEnvironmentRequirement(raw.environment, "environment"));
  }

  let staticChecks: StaticCheck[] | undefined;
  if (raw.static !== undefined) {
    if (!isObject(raw.static) || !Array.isArray(raw.static.checks)) {
      errors.push("static.checks は配列で書いてください");
    } else {
      raw.static.checks.forEach((check, index) => {
        validateStaticCheck(check, `static.checks[${index}]`, errors);
      });
      staticChecks = raw.static.checks as StaticCheck[];
    }
  }
  if (raw.runner === "static-preview" && (!staticChecks || staticChecks.length === 0)) {
    errors.push("runner が static-preview の課題には static.checks が要ります");
  }

  let references: PublicSourceReference[] | undefined;
  if (raw.references !== undefined) {
    try {
      references = parsePublicSourceReferences(raw.references);
    } catch (error) {
      errors.push(String(error));
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const manifest: TaskManifest = {
    schemaVersion: 1,
    id: id as string,
    title: (raw.title as string).trim(),
    kind: raw.kind as TaskKind,
    runner: raw.runner as RunnerId,
    submit: { files: submitFiles },
    protected: protectedPatterns,
    checks,
  };
  if (raw.environment !== undefined)
    manifest.environment = raw.environment as EnvironmentRequirement;
  if (references) manifest.references = references;
  if (staticChecks) manifest.static = { checks: staticChecks };
  return { ok: true, manifest };
}
