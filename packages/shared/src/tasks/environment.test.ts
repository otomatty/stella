import { describe, expect, it } from "vitest";
import {
  checkToolVersion,
  compareVersions,
  describeRequirement,
  parseVersion,
  validateEnvironmentRequirement,
} from "./environment.js";

describe("parseVersion", () => {
  it("各コマンドの出力から版を読む", () => {
    expect(parseVersion("v22.22.0\n")).toEqual([22, 22, 0]);
    expect(parseVersion("10.9.4")).toEqual([10, 9, 4]);
    expect(parseVersion("git version 2.45.1.windows.1")).toEqual([2, 45, 1]);
    expect(parseVersion("git version 2.39")).toEqual([2, 39, 0]);
  });

  it("版が無ければ null", () => {
    expect(parseVersion("command not found")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("major・minor・patch の順に比べる", () => {
    expect(compareVersions([22, 12, 0], [22, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([20, 0, 0], [22, 0, 0])).toBeLessThan(0);
    expect(compareVersions([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe("checkToolVersion", () => {
  const requirement = { min: "22.12.0", maxMajor: 24 };

  it("見つからなければ missing", () => {
    expect(checkToolVersion(null, requirement)).toEqual({ ok: false, reason: "missing" });
  });

  it("古い版・新しすぎる版を区別する", () => {
    expect(checkToolVersion("v20.18.0", requirement)).toEqual({
      ok: false,
      reason: "too-old",
      version: [20, 18, 0],
    });
    expect(checkToolVersion("v26.0.0", requirement)).toEqual({
      ok: false,
      reason: "too-new",
      version: [26, 0, 0],
    });
  });

  it("範囲内なら ok。要件が無ければ版が読めれば ok", () => {
    expect(checkToolVersion("v24.1.0", requirement)).toEqual({ ok: true, version: [24, 1, 0] });
    expect(checkToolVersion("v18.0.0", undefined)).toEqual({ ok: true, version: [18, 0, 0] });
    expect(checkToolVersion("unknown", undefined)).toEqual({ ok: false, reason: "unparsable" });
  });
});

describe("checkToolVersion (使える major 版)", () => {
  // 道具の多くが ^22.13.0 || ^24.0.0 のように偶数の LTS だけに対応する。
  const requirement = { min: "22.13.0", majors: [22, 24] };

  it("一覧の major 版で、min 以上なら ok", () => {
    expect(checkToolVersion("v22.13.0", requirement).ok).toBe(true);
    expect(checkToolVersion("v22.22.0", requirement).ok).toBe(true);
    expect(checkToolVersion("v24.0.0", requirement).ok).toBe(true);
    expect(checkToolVersion("v24.11.1", requirement).ok).toBe(true);
  });

  it("一覧の間の major 版 (23) は unsupported、min 未満は too-old、上は too-new", () => {
    expect(checkToolVersion("v23.11.0", requirement)).toEqual({
      ok: false,
      reason: "unsupported",
      version: [23, 11, 0],
    });
    expect(checkToolVersion("v22.12.0", requirement)).toMatchObject({ reason: "too-old" });
    expect(checkToolVersion("v20.19.0", requirement)).toMatchObject({ reason: "too-old" });
    expect(checkToolVersion("v25.0.0", requirement)).toMatchObject({ reason: "too-new" });
    expect(checkToolVersion("v26.1.0", requirement)).toMatchObject({ reason: "too-new" });
  });
});

describe("describeRequirement", () => {
  it("画面向けの文にする", () => {
    expect(describeRequirement({ min: "22.12.0", maxMajor: 24 })).toBe("22.12.0 以上、24 系まで");
    expect(describeRequirement({ min: "22.13.0", majors: [22, 24] })).toBe(
      "22.13.0 以上、22・24 系",
    );
    expect(describeRequirement(undefined)).toBe("");
  });
});

describe("validateEnvironmentRequirement", () => {
  it("majors は重複の無い整数の配列に限る", () => {
    expect(validateEnvironmentRequirement({ node: { majors: [22, 24] } }, "env")).toEqual([]);
    for (const majors of [[], [22, 22], [22.5], ["22"], 22]) {
      expect(validateEnvironmentRequirement({ node: { majors } }, "env")).toEqual([
        "env.node.majors は重複の無い整数の配列で書いてください (例 [22, 24])",
      ]);
    }
  });
});
