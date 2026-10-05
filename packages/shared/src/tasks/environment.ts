/**
 * 課題が求める開発環境 (Node.js・npm・Git の版) と、見つかった版との照合。
 *
 * 環境の定義は教材側 (`packages/content/environments/<id>.json`) が正本で、
 * 課題の `.stella/task.json` に写して配る。照合は「何か数字が出たら合格」にせず、
 * 定義した版と比べる (docs/curriculum/06 §5)。
 */

export const ENVIRONMENT_TOOLS = ["node", "npm", "git"] as const;
export type EnvironmentTool = (typeof ENVIRONMENT_TOOLS)[number];

export const ENVIRONMENT_TOOL_LABELS: Readonly<Record<EnvironmentTool, string>> = {
  node: "Node.js",
  npm: "npm",
  git: "Git",
};

export interface ToolRequirement {
  /** これ以上の版を求める (例 "22.12.0")。 */
  min?: string;
  /** この major 版まで (例 22 なら 23 以降は対象外)。 */
  maxMajor?: number;
}

export interface EnvironmentRequirement {
  /** 教材側の環境定義の ID (例 "web-training-01")。記録用。 */
  id?: string;
  node?: ToolRequirement;
  npm?: ToolRequirement;
  git?: ToolRequirement;
}

export type Version = readonly [number, number, number];

/**
 * コマンドの出力から最初の版番号を取り出す。
 * 例: "v22.22.0" / "10.9.4" / "git version 2.45.1.windows.1"。
 */
export function parseVersion(text: string): Version | null {
  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function formatVersion(version: Version): string {
  return version.join(".");
}

/** 要件を画面向けの文にする。要件が無ければ空文字。 */
export function describeRequirement(requirement: ToolRequirement | undefined): string {
  if (!requirement) return "";
  const parts: string[] = [];
  if (requirement.min) parts.push(`${requirement.min} 以上`);
  if (requirement.maxMajor !== undefined) parts.push(`${requirement.maxMajor} 系まで`);
  return parts.join("、");
}

export type ToolCheck =
  | { ok: true; version: Version }
  | { ok: false; reason: "missing" | "unparsable" | "too-old" | "too-new"; version?: Version };

/** 見つかった版 (コマンドの出力。見つからなければ null) が要件を満たすか。 */
export function checkToolVersion(
  output: string | null,
  requirement: ToolRequirement | undefined,
): ToolCheck {
  if (output === null) return { ok: false, reason: "missing" };
  const version = parseVersion(output);
  if (!version) return { ok: false, reason: "unparsable" };
  if (requirement?.min) {
    const min = parseVersion(requirement.min);
    if (min && compareVersions(version, min) < 0) {
      return { ok: false, reason: "too-old", version };
    }
  }
  if (requirement?.maxMajor !== undefined && version[0] > requirement.maxMajor) {
    return { ok: false, reason: "too-new", version };
  }
  return { ok: true, version };
}

/** 要件の形だけを検査する (task.json の検証から使う)。エラー文の配列を返す。 */
export function validateEnvironmentRequirement(raw: unknown, at: string): string[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [`${at} はオブジェクトで書いてください`];
  }
  const errors: string[] = [];
  const env = raw as Record<string, unknown>;
  if (env.id !== undefined && typeof env.id !== "string") {
    errors.push(`${at}.id は文字列で書いてください`);
  }
  for (const key of Object.keys(env)) {
    if (key !== "id" && !(ENVIRONMENT_TOOLS as readonly string[]).includes(key)) {
      errors.push(`${at}.${key} は使えません (使えるのは ${ENVIRONMENT_TOOLS.join(" / ")})`);
    }
  }
  for (const tool of ENVIRONMENT_TOOLS) {
    const req = env[tool];
    if (req === undefined) continue;
    if (typeof req !== "object" || req === null || Array.isArray(req)) {
      errors.push(`${at}.${tool} はオブジェクトで書いてください`);
      continue;
    }
    const { min, maxMajor } = req as Record<string, unknown>;
    if (min !== undefined && (typeof min !== "string" || parseVersion(min) === null)) {
      errors.push(`${at}.${tool}.min は "22.12.0" のような版番号で書いてください`);
    }
    if (maxMajor !== undefined && (typeof maxMajor !== "number" || !Number.isInteger(maxMajor))) {
      errors.push(`${at}.${tool}.maxMajor は整数で書いてください`);
    }
  }
  return errors;
}
