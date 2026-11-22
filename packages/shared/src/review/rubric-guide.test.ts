import { describe, expect, it } from "vitest";
import { parseRubricGuide } from "./rubric-guide.js";

const at = "review.rubric[compare].guide";
const guide = {
  title: "比較した結果を返す",
  problem: "比較の結果を条件分岐で選び直しています。",
  why: "比較式の値は真偽値です。",
};
const example = {
  context: "荷物の重さを確かめる",
  ng: "  if (weight <= 10) return true;\n  return false;",
  ok: "  return weight <= 10;",
};

describe("parseRubricGuide", () => {
  it("例を省略でき、例があればコードのインデントを保つ", () => {
    expect(parseRubricGuide(guide, at)).toStrictEqual(guide);
    expect(parseRubricGuide({ ...guide, example }, at)).toStrictEqual({ ...guide, example });
  });

  it.each(["title", "problem", "why"] as const)("%s は必須", (key) => {
    const raw: Partial<typeof guide> = { ...guide };
    delete raw[key];
    expect(() => parseRubricGuide(raw, at)).toThrow(`${at}.${key}: 空でない文字列`);
  });

  it.each(["context", "ng", "ok"] as const)("example.%s は必須", (key) => {
    const raw: Partial<typeof example> = { ...example };
    delete raw[key];
    expect(() => parseRubricGuide({ ...guide, example: raw }, at)).toThrow(
      `${at}.example.${key}: 空でない文字列`,
    );
  });

  it.each([
    ["title", 40],
    ["problem", 200],
    ["why", 400],
  ] as const)("%s は %i 文字まで", (key, limit) => {
    expect(parseRubricGuide({ ...guide, [key]: "文".repeat(limit) }, at)[key]).toHaveLength(limit);
    expect(() => parseRubricGuide({ ...guide, [key]: "文".repeat(limit + 1) }, at)).toThrow(
      `${at}.${key}: ${limit} 文字以内`,
    );
  });

  it("context は 60 文字まで", () => {
    expect(() =>
      parseRubricGuide({ ...guide, example: { ...example, context: "文".repeat(61) } }, at),
    ).toThrow(`${at}.example.context: 60 文字以内`);
  });

  it.each(["ng", "ok"] as const)("example.%s は空白だけにできず、20 行・各 120 文字まで", (key) => {
    const parse = (value: string) =>
      parseRubricGuide({ ...guide, example: { ...example, [key]: value } }, at);
    const maxCode = Array<string>(20).fill("a".repeat(120)).join("\r\n");
    expect(parse(maxCode).example?.[key]).toBe(maxCode);
    expect(() => parse(`${maxCode}\r\na`)).toThrow(`${at}.example.${key}: 1〜20 行`);
    expect(() => parse("a".repeat(121))).toThrow(`${at}.example.${key}: 1 行 120 文字以内`);
    expect(() => parse(" \n\t ")).toThrow(`${at}.example.${key}: 空でない文字列`);
  });

  it("guide と example の未知のキーを拒否する", () => {
    expect(() => parseRubricGuide({ ...guide, extra: true }, at)).toThrow(
      `${at}.extra: 未知のキー`,
    );
    expect(() => parseRubricGuide({ ...guide, example: { ...example, extra: true } }, at)).toThrow(
      `${at}.example.extra: 未知のキー`,
    );
  });
});
