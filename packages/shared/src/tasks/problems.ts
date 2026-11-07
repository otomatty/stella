/**
 * 課題の中の「問題」。確認・提出・記録の単位で、1 問 1 ファイル。
 * パスは ID からこの関数だけで決める。課題ごとにパスは書かない。
 */

import type { RunnerPlanKind } from "./runners.js";

/** `^[a-z0-9][a-z0-9-]*$`。`..`・空白・`-p:` はここに当たらない。 */
export const PROBLEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export interface TaskProblem {
  id: string;
  title: string;
}

export function isProblemId(value: string): boolean {
  return PROBLEM_ID_PATTERN.test(value);
}

const PROBLEM_PLANS = new Set<RunnerPlanKind>(["vitest", "typescript", "dotnet"]);

/** vitest・typescript は `.ts`、dotnet は `.cs`。書けない手順や不正な ID は null。 */
export function problemFiles(
  plan: RunnerPlanKind,
  id: string,
): { source: string; test: string } | null {
  if (!PROBLEM_PLANS.has(plan) || !isProblemId(id)) return null;
  const ext = plan === "dotnet" ? "cs" : "ts";
  return { source: `src/${id}.${ext}`, test: `tests/${id}.test.${ext}` };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `problems` が無い課題は何も足さない。あるときは 1 件以上で、書ける手順だけを通す。
 * `plan` が null なのは、runner 自体がまだ不正なとき。
 */
export function readProblems(
  raw: unknown,
  plan: RunnerPlanKind | null,
): { problems?: TaskProblem[]; errors: string[] } {
  if (raw === undefined) return { errors: [] };
  const errors: string[] = [];
  if (plan === null || !PROBLEM_PLANS.has(plan)) {
    errors.push("problems は手順が vitest・typescript・dotnet の課題だけに書けます");
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("problems は 1 件以上の配列で書いてください");
    return { errors };
  }
  const problems: TaskProblem[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < raw.length; index++) {
    const item = raw[index];
    const at = `problems[${index}]`;
    if (!isObject(item)) {
      errors.push(`${at} はオブジェクトで書いてください`);
      continue;
    }
    const id = typeof item.id === "string" ? item.id : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!isProblemId(id)) {
      errors.push(`${at}.id は英小文字・数字・ハイフンで書いてください (例 "q01-add-tax")`);
    } else if (seen.has(id)) {
      errors.push(`${at}.id が重複しています: ${id}`);
    } else {
      seen.add(id);
    }
    if (title.length === 0) {
      errors.push(`${at}.title は空でない文字列で書いてください`);
    }
    if (isProblemId(id) && title.length > 0 && !problems.some((problem) => problem.id === id)) {
      problems.push({ id, title });
    }
  }
  if (errors.length > 0) return { errors };
  return { problems, errors };
}
