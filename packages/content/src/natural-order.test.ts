import { describe, expect, it } from "vitest";
import { compareNatural, sortNatural } from "./natural-order.mjs";

describe("sortNatural", () => {
  // これが辞書順だと m10-mock-exam が m1 と m2 の間に入り、模擬試験モジュールを
  // 最後のセクションとして出せない (LMS のセクション順・語彙台帳の学習順の両方)。
  it("2 桁のモジュールを 1 桁の後ろに置く", () => {
    expect(
      sortNatural(["m10-mock-exam", "m2-computer-systems", "m1-foundations", "m9-corporate-legal"]),
    ).toEqual(["m1-foundations", "m2-computer-systems", "m9-corporate-legal", "m10-mock-exam"]);
  });

  it("パス全体でも数字の桁で崩れない", () => {
    const paths = [
      "courses/fe-kamoku-a/modules/m10-mock-exam/l1-mock/t1-time-strategy/slides.md",
      "courses/fe-kamoku-a/modules/m2-computer-systems/l1-processor-memory/t1-five-units/slides.md",
      "courses/fe-kamoku-a/modules/m1-foundations/l1-number-systems/t10-x/slides.md",
      "courses/fe-kamoku-a/modules/m1-foundations/l1-number-systems/t2-hex/slides.md",
    ];
    expect(sortNatural(paths)).toEqual([
      "courses/fe-kamoku-a/modules/m1-foundations/l1-number-systems/t2-hex/slides.md",
      "courses/fe-kamoku-a/modules/m1-foundations/l1-number-systems/t10-x/slides.md",
      "courses/fe-kamoku-a/modules/m2-computer-systems/l1-processor-memory/t1-five-units/slides.md",
      "courses/fe-kamoku-a/modules/m10-mock-exam/l1-mock/t1-time-strategy/slides.md",
    ]);
  });

  // 既存講座 (m0〜m9 運用) の並びが変わらないことの担保。桁数が揃っていれば辞書順と同じ。
  it("桁数が揃った名前では辞書順と同じ結果になる", () => {
    const names = [
      "m0-orientation",
      "m9-practice",
      "m1-values",
      "l3-stats-ai",
      "t5-shift",
      "typescript-basics",
      "sql-basics",
    ];
    expect(sortNatural(names)).toEqual([...names].sort());
  });

  it("前置ゼロの違いだけでも順序が一意に決まる", () => {
    expect(compareNatural("m01", "m1")).toBeLessThan(0);
    expect(compareNatural("m1", "m01")).toBeGreaterThan(0);
    expect(compareNatural("m1", "m1")).toBe(0);
  });

  it("前方が一致して片方が長いときは短いほうが先", () => {
    expect(sortNatural(["m1-a", "m1", "m1-a-b"])).toEqual(["m1", "m1-a", "m1-a-b"]);
  });
});
