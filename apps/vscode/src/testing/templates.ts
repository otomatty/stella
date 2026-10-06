/**
 * テスト用: 教材の runner ごとの課題テンプレート (`packages/content/templates/runners/`) と、
 * 拡張の見本 (`apps/vscode/samples/`) を読む。
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RunnerId } from "@stella/shared/tasks/runners";
import { listFiles } from "../runner/files.js";

export const CONTENT_DIR = fileURLToPath(new URL("../../../../packages/content/", import.meta.url));
export const TEMPLATES_DIR = path.join(CONTENT_DIR, "templates", "runners");
export const SAMPLES_DIR = fileURLToPath(new URL("../../samples/", import.meta.url));

/** テンプレートを用意した runner。static-preview・env-diagnose は Node.js の道具を使わない。 */
export const TEMPLATE_RUNNERS = [
  "node-test",
  "dom-test",
  "http-mock",
  "react-test",
  "storybook",
  "api-test",
  "db",
  "e2e",
  "next-app",
] as const satisfies readonly RunnerId[];

/**
 * CI と公開のテンプレート (07 §5.5)。テストは受講者の GitHub Actions が動かすので、Node.js の
 * 道具 (lockfile・ESLint・Prettier) を持たず、ワークフローの雛形を持つ。検査は別に書く。
 */
export const CI_TEMPLATE_RUNNER = "ci-deploy" as const satisfies RunnerId;

/** `packages/content/templates/runners/` のフォルダー。 */
export const TEMPLATE_DIRS = [...TEMPLATE_RUNNERS, CI_TEMPLATE_RUNNER] as const;

/** テンプレートの task-fields.json。課題の task.json に写す runner まわりの項目。 */
export interface TaskFields {
  runner: RunnerId;
  environment: string;
  submit: { files: string[] };
  protected: string[];
  checks: { lint: boolean; format: boolean };
  /** CI と公開の課題が指定するワークフロー。 */
  ci?: { workflow: string };
}

export interface EnvironmentFile {
  id: string;
  version: string;
  runner: string;
  template: string;
  requirements: Record<string, unknown>;
  libraries: Record<string, string>;
  /** CI と公開の環境台帳だけが持つ、GitHub Actions の実行環境と action の版。 */
  ci?: { runsOn: string; node: string; actions: Record<string, string> };
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/** テンプレートを課題フォルダーの形 (starter/ を直下、tests/ を tests/) に並べたファイル一覧。 */
export async function templateFiles(runner: string): Promise<string[]> {
  const dir = path.join(TEMPLATES_DIR, runner);
  const starter = await listFiles(path.join(dir, "starter"));
  const tests = (await listFiles(path.join(dir, "tests"))).map((file) => `tests/${file}`);
  return [...starter, ...tests].sort();
}

/** テンプレートの中のファイルの場所。rel は課題フォルダーからの相対パス。 */
export function templateFile(runner: string, rel: string): string {
  const [first, ...rest] = rel.split("/");
  return first === "tests"
    ? path.join(TEMPLATES_DIR, runner, "tests", ...rest)
    : path.join(TEMPLATES_DIR, runner, "starter", ...rel.split("/"));
}

export function readTaskFields(runner: string): Promise<TaskFields> {
  return readJson<TaskFields>(path.join(TEMPLATES_DIR, runner, "task-fields.json"));
}

export function readEnvironmentFile(id: string): Promise<EnvironmentFile> {
  return readJson<EnvironmentFile>(path.join(CONTENT_DIR, "environments", `${id}.json`));
}

/**
 * テンプレートの項目と環境台帳から、拡張に配る `.stella/task.json` の形を組み立てる
 * (教材の生成処理 `toRuntimeManifest` と同じく、環境の ID を `<id>@<version>` にする)。
 */
export async function templateManifest(
  runner: string,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { environment, ...fields } = await readTaskFields(runner);
  const env = await readEnvironmentFile(environment);
  return {
    schemaVersion: 1,
    id: `templates/${runner}/example`,
    title: "テンプレート",
    kind: "basic",
    ...fields,
    environment: { ...env.requirements, id: `${env.id}@${env.version}` },
    ...overrides,
  };
}
