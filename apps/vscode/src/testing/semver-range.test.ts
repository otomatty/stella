import { describe, expect, it } from "vitest";
import { satisfiesRange } from "./semver-range.js";

describe("satisfiesRange (テスト用の engines の読み取り)", () => {
  it.each([
    ["^22.12.0 || ^24.0.0 || >=26.0.0", [22, 13, 0], true],
    ["^22.12.0 || ^24.0.0 || >=26.0.0", [23, 11, 0], false],
    ["^22.12.0 || ^24.0.0 || >=26.0.0", [22, 11, 9], false],
    ["^22.12.0 || ^24.0.0 || >=26.0.0", [26, 1, 0], true],
    ["^20.19.0 || ^22.13.0 || >=24", [22, 12, 0], false],
    ["^20.19.0 || ^22.13.0 || >=24", [24, 0, 0], true],
    [">= 0.8", [22, 0, 0], true],
    [">=v12.22.7", [12, 22, 6], false],
    ["6.* || 8.* || >= 10.*", [9, 0, 0], false],
    ["6.* || 8.* || >= 10.*", [8, 1, 0], true],
    ["18 || 20 || >=22", [21, 0, 0], false],
    [">=16 || 14 >=14.17", [14, 16, 0], false],
    [">=16 || 14 >=14.17", [14, 17, 0], true],
    ["^13.7", [13, 9, 0], true],
    ["^13.7", [14, 0, 0], false],
    ["~1.2.3", [1, 2, 9], true],
    ["~1.2.3", [1, 3, 0], false],
    ["^0.4.1", [0, 5, 0], false],
    ["<24.0.0", [23, 9, 9], true],
  ] as const)("%s に %j は %s", (range, version, expected) => {
    expect(satisfiesRange(version, range)).toBe(expected);
  });

  it("読めない書き方は例外にする", () => {
    expect(() => satisfiesRange([22, 0, 0], "lts/*")).toThrow();
    expect(() => satisfiesRange([22, 0, 0], ">22")).toThrow();
  });
});
