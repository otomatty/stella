import type { RubricGuide } from "./ai-review.js";

function object(raw: unknown, at: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error(`${at}: オブジェクトが必要です`);
  for (const key of Object.keys(raw))
    if (!keys.includes(key)) throw new Error(`${at}.${key}: 未知のキーです`);
  return raw as Record<string, unknown>;
}

function nonEmptyText(raw: unknown, at: string): string {
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`${at}: 空でない文字列が必要です`);
  return raw;
}

function limitedText(raw: unknown, at: string, limit: number): string {
  const value = nonEmptyText(raw, at);
  if ([...value].length > limit) throw new Error(`${at}: ${limit} 文字以内で書いてください`);
  return value;
}

function code(raw: unknown, at: string): string {
  const value = nonEmptyText(raw, at);
  const lines = value.split(/\r\n|\r|\n/);
  if (lines.length > 20) throw new Error(`${at}: 1〜20 行で書いてください`);
  if (lines.some((line) => [...line].length > 120))
    throw new Error(`${at}: 1 行 120 文字以内で書いてください`);
  return value;
}

export function parseRubricGuide(raw: unknown, at: string): RubricGuide {
  const row = object(raw, at, ["title", "problem", "why", "example"]);
  const guide: RubricGuide = {
    title: limitedText(row.title, `${at}.title`, 40),
    problem: limitedText(row.problem, `${at}.problem`, 200),
    why: limitedText(row.why, `${at}.why`, 400),
  };
  if (row.example !== undefined) {
    const exampleAt = `${at}.example`;
    const example = object(row.example, exampleAt, ["context", "ng", "ok"]);
    guide.example = {
      context: limitedText(example.context, `${exampleAt}.context`, 60),
      ng: code(example.ng, `${exampleAt}.ng`),
      ok: code(example.ok, `${exampleAt}.ok`),
    };
  }
  return guide;
}
