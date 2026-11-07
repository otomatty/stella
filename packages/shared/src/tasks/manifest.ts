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

import picomatch from "picomatch";
import { isCiWorkflowPath } from "./ci-run.js";
import { DOTNET_PROTECTED_FILES } from "./dotnet.js";
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
  | { type: "file-absent"; path: string; name?: string }
  | {
      type: "file-contains";
      path: string;
      text: string;
      match?: "contains" | "exact";
      name?: string;
    }
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
  "file-absent",
  "file-contains",
  "html-document",
  "element-text",
  "element-count",
  "links-resolve",
  "stylesheet-linked",
] as const satisfies readonly StaticCheck["type"][];

export type GitCheck =
  | { type: "learning-folder-root"; name?: string }
  | { type: "local-identity"; name?: string }
  | { type: "committed"; paths: string[]; name?: string }
  | { type: "commit-count"; min: number; name?: string }
  | { type: "ignored"; path: string; name?: string };

const GIT_CHECK_TYPES = [
  "learning-folder-root",
  "local-identity",
  "committed",
  "commit-count",
  "ignored",
] as const;

export interface TaskManifest {
  schemaVersion: 1;
  /** `<ステージslug>/<単元>/<課題>`。短い番号だけで結果を保存しない (docs/curriculum/04 §3)。 */
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
  git?: { checks: GitCheck[] };
  /**
   * CI と公開 (`ci-deploy`) の課題が指定する GitHub Actions のワークフロー
   * (リポジトリの一番上からのパス。例 `.github/workflows/deploy.yml`)。提出を受けた API が、
   * 受講者の申告した実行がこのワークフローのものかを確かめる (07 §5.5)。ci-deploy の課題に必須で、
   * ほかの runner には書けない。
   */
  ci?: { workflow: string };
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

function validateCheckPath(value: unknown, at: string, errors: string[]): void {
  if (typeof value !== "string" || !isSafeRelativePattern(value) || /[*?{}[\]]/.test(value)) {
    errors.push(`${at} は課題フォルダーからの相対パスで書いてください (glob は使えません)`);
  }
}

function validateGitCheck(raw: unknown, at: string, errors: string[]): void {
  if (!isObject(raw)) {
    errors.push(`${at} はオブジェクトで書いてください`);
    return;
  }
  if (!(GIT_CHECK_TYPES as readonly unknown[]).includes(raw.type)) {
    errors.push(`${at}.type は ${GIT_CHECK_TYPES.join(" / ")} のどれかにしてください`);
    return;
  }
  if (raw.name !== undefined && typeof raw.name !== "string")
    errors.push(`${at}.name は文字列で書いてください`);
  if (raw.type === "ignored") validateCheckPath(raw.path, `${at}.path`, errors);
  if (raw.type === "committed") {
    if (!Array.isArray(raw.paths) || raw.paths.length === 0)
      errors.push(`${at}.paths は 1 件以上の配列で書いてください`);
    else
      raw.paths.forEach((p, i) => {
        validateCheckPath(p, `${at}.paths[${i}]`, errors);
      });
  }
  if (
    raw.type === "commit-count" &&
    (typeof raw.min !== "number" || !Number.isInteger(raw.min) || raw.min < 1)
  ) {
    errors.push(`${at}.min は 1 以上の整数で書いてください`);
  }
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
  validateCheckPath(raw.path, `${at}.path`, errors);
  if (raw.name !== undefined && typeof raw.name !== "string") {
    errors.push(`${at}.name は文字列で書いてください`);
  }
  if (type === "element-text" || type === "element-count") {
    if (typeof raw.tag !== "string" || !TAG_NAME.test(raw.tag)) {
      errors.push(`${at}.tag は小文字のタグ名で書いてください (例 "h1")`);
    }
  }
  if (type === "element-text" || type === "file-contains") {
    if (typeof raw.text !== "string" || (type === "element-text" && raw.text.length === 0)) {
      errors.push(
        type === "element-text"
          ? `${at}.text は空でない文字列で書いてください`
          : `${at}.text は文字列で書いてください`,
      );
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
      'id は "<ステージslug>/<単元>/<課題>" の形 (英小文字・数字・ハイフン) で書いてください',
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

  if (raw.runner === "dotnet-test") {
    // ESLint・Prettier は C# を検査しない。lint・整形の有無で手順を増やさない。
    if (checks.lint || checks.format) {
      errors.push(
        "runner が dotnet-test の課題では checks.lint・checks.format を使えません (ESLint・Prettier は C# を検査しません)",
      );
    }
    for (const file of DOTNET_PROTECTED_FILES) {
      if (!protectedPatterns.some((pattern) => picomatch(pattern, { dot: true })(file))) {
        errors.push(`runner が dotnet-test の課題では protected に ${file} を入れてください`);
      }
      if (submitFiles.some((pattern) => picomatch(pattern, { dot: true })(file))) {
        errors.push(`${file} は配布したファイルなので submit.files に入れられません`);
      }
    }
    // 設定ファイルだけでは tests/ を覆えない。当たり判定ではなく tests/** という文字列を必須にする
    // (tests/AnswersTests.cs だけ、tests/*.cs では配布したテスト全体を照合できない)。
    if (!protectedPatterns.includes("tests/**")) {
      errors.push(
        "runner が dotnet-test の課題では protected に tests/** を入れてください (配布したテストの改変を提出で照合するため)",
      );
    }
    // コンパイルするのは src/**/*.cs と tests/**/*.cs だけ。受講者のコードは src/ に置く。
    // 有限個の仮のファイル名では **/ConsoleOutput.cs のように tests/ へ当たるパターンを取りこぼすので、
    // どのパターンも src/ で始まることを求める (tests/ には当たりえない)。
    if (submitFiles.some((pattern) => !pattern.startsWith("src/"))) {
      errors.push(
        "runner が dotnet-test の課題では submit.files を src/ の下のパターンにしてください (受講者のコードは src/ に置き、tests/ は配布したテストのため)",
      );
    }
    // src/Answers.cs だけだと、分けた src/Helper.cs がビルドに入るのに提出の照合から外れる。
    // 当たり判定ではなく src/**/*.cs という文字列を必須にする。
    if (!submitFiles.includes("src/**/*.cs")) {
      errors.push(
        "runner が dotnet-test の課題では submit.files に src/**/*.cs を入れてください (コンパイルする src/ の .cs をすべて提出するため)",
      );
    }
  }

  if (raw.runner === "ts-test") {
    // any や @ts-ignore で型を逃げる書き方は、tsc では止まらない。ESLint で止める。
    if (!checks.lint) {
      errors.push(
        "runner が ts-test の課題では checks.lint を true にしてください (any や @ts-ignore による型の逃げを ESLint で止めるため)",
      );
    }
    for (const file of [
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "eslint.config.js",
      "vitest.config.js",
    ]) {
      if (!protectedPatterns.some((pattern) => picomatch(pattern, { dot: true })(file))) {
        errors.push(`runner が ts-test の課題では protected に ${file} を入れてください`);
      }
      if (submitFiles.some((pattern) => picomatch(pattern, { dot: true })(file))) {
        errors.push(`${file} は配布したファイルなので submit.files に入れられません`);
      }
    }
    // 設定ファイルだけでは tests/ を覆えない。当たり判定ではなく tests/** という文字列を必須にする
    // (tests/Answers.test.ts だけ、tests/*.ts では配布したテスト全体を照合できない)。
    if (!protectedPatterns.includes("tests/**")) {
      errors.push(
        "runner が ts-test の課題では protected に tests/** を入れてください (配布したテストの改変を提出で照合するため)",
      );
    }
    // tsconfig.json が型を確かめるのは src/ と tests/。受講者のコードは src/ に置く。
    // 有限個の仮のファイル名では **/answer.ts のように tests/ へ当たるパターンを取りこぼすので、
    // どのパターンも src/ で始まることを求める (tests/ には当たりえない)。
    if (submitFiles.some((pattern) => !pattern.startsWith("src/"))) {
      errors.push(
        "runner が ts-test の課題では submit.files を src/ の下のパターンにしてください (tsconfig.json が型を確かめるのは src/ と tests/ のため)",
      );
    }
    // src/greet.ts だけだと、分けた src/helper.ts が型の確認に入るのに提出の照合から外れる。
    // 当たり判定ではなく src/**/*.ts という文字列を必須にする。
    if (!submitFiles.includes("src/**/*.ts")) {
      errors.push(
        "runner が ts-test の課題では submit.files に src/**/*.ts を入れてください (型を確かめる src/ の .ts をすべて提出するため)",
      );
    }
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

  let gitChecks: GitCheck[] | undefined;
  if (raw.git !== undefined) {
    if (!isObject(raw.git) || !Array.isArray(raw.git.checks))
      errors.push("git.checks は配列で書いてください");
    else {
      raw.git.checks.forEach((check, index) => {
        validateGitCheck(check, `git.checks[${index}]`, errors);
      });
      gitChecks = raw.git.checks as GitCheck[];
    }
  }
  if (raw.runner === "git-record" && !gitChecks?.length)
    errors.push("runner が git-record の課題には git.checks が 1 件以上要ります");

  let ci: TaskManifest["ci"];
  if (raw.ci !== undefined) {
    const workflow = isObject(raw.ci) ? raw.ci.workflow : undefined;
    if (raw.runner !== "ci-deploy") {
      errors.push("ci は runner が ci-deploy の課題だけに書けます");
    } else if (!isCiWorkflowPath(workflow)) {
      errors.push(
        "ci.workflow は .github/workflows/ の下の .yml・.yaml のパスで書いてください (例 .github/workflows/deploy.yml)",
      );
    } else if (
      ![...submitFiles, ...protectedPatterns].some((pattern) =>
        picomatch(pattern, { dot: true })(workflow),
      )
    ) {
      // レビューで読む (提出) か、改変を照合する (配布) ファイルにする。どちらでもないと、
      // 実行したワークフローの中身を誰も確かめない。
      errors.push("ci.workflow は submit.files か protected に当たるパスにしてください");
    } else {
      ci = { workflow };
    }
  } else if (raw.runner === "ci-deploy") {
    errors.push(
      "runner が ci-deploy の課題には ci.workflow (確かめる GitHub Actions のワークフロー) が要ります",
    );
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
  if (gitChecks) manifest.git = { checks: gitChecks };
  if (ci) manifest.ci = ci;
  return { ok: true, manifest };
}
