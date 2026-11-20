import { describe, expect, expectTypeOf, test } from "vitest";
import { clamp, formatDuration, logLine } from "../src/q02-params-return";

describe("clamp", () => {
  test("min 以上 max 以下に収める", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  test("min が max より大きければ Error", () => {
    expect(() => clamp(5, 10, 0)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(clamp).parameters.toEqualTypeOf<[number, number, number]>();
    expectTypeOf(clamp).returns.toEqualTypeOf<number>();
  });
});

describe("logLine", () => {
  test("lines の末尾に行を足す", () => {
    const lines: string[] = [];
    logLine(lines, "info", "起動しました");
    logLine(lines, "error", "失敗しました");
    expect(lines).toEqual(["[INFO] 起動しました", "[ERROR] 失敗しました"]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(logLine).parameters.toEqualTypeOf<[string[], "info" | "warn" | "error", string]>();
    expectTypeOf(logLine).returns.toBeVoid();
  });
});

describe("formatDuration", () => {
  test("時間・分・秒の形にする", () => {
    expect(formatDuration(3723)).toBe("1時間2分3秒");
    expect(formatDuration(125)).toBe("2分5秒");
    expect(formatDuration(3600)).toBe("1時間");
    expect(formatDuration(3605)).toBe("1時間5秒");
    expect(formatDuration(0)).toBe("0秒");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(formatDuration).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(formatDuration).returns.toEqualTypeOf<string>();
  });
});
