import { describe, expect, it } from "vitest";
import { assignments } from "./index.js";

/**
 * 新規に追加する TypeScript 課題の品質ゲート。
 * 既存の JavaScript 課題 279 件は対象外（hints が 3 未満のものが 87 件あり、
 * この移行では触らない）。id 重複だけは全件で見る。
 */
const tsAssignments = assignments.filter((a) => a.language === "typescript");

describe("assignments", () => {
  it("id が全件で重複しない", () => {
    const ids = assignments.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("TypeScript 課題の starterFiles は .ts", () => {
    for (const a of tsAssignments) {
      for (const f of a.starterFiles) {
        expect(f.path.endsWith(".ts")).toBe(true);
      }
    }
  });

  it("TypeScript の stdout 課題には expectedStdout がある", () => {
    for (const a of tsAssignments) {
      if (a.testKind !== "stdout") continue;
      expect(a.tests.length).toBeGreaterThan(0);
      for (const t of a.tests) expect(typeof t.expectedStdout).toBe("string");
    }
  });

  it("TypeScript 課題の hints は 3 つ以上", () => {
    for (const a of tsAssignments) {
      expect(a.hints?.length ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("TypeScript 課題には solution がある", () => {
    for (const a of tsAssignments) expect(a.solution).toBeTruthy();
  });

  it("TypeScript 課題の id は 3 桁のレッスンセグメントを持つ", () => {
    for (const a of tsAssignments) {
      expect(a.id.split("-")[2]).toMatch(/^\d{3}$/);
    }
  });
});
