import { describe, expect, it } from "vitest";
import {
  checkToolVersion,
  compareVersions,
  describeRequirement,
  parseVersion,
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

describe("describeRequirement", () => {
  it("画面向けの文にする", () => {
    expect(describeRequirement({ min: "22.12.0", maxMajor: 24 })).toBe("22.12.0 以上、24 系まで");
    expect(describeRequirement(undefined)).toBe("");
  });
});
