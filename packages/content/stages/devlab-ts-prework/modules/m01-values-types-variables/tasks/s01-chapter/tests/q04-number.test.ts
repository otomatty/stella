import { describe, expect, expectTypeOf, test } from "vitest";
import { percent, roundTo } from "../src/q04-number";

describe("roundTo", () => {
  test("指定した桁までに四捨五入する", () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(1234.5678, 1)).toBe(1234.6);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(10, 3)).toBe(10);
  });

  test("NaN と Infinity は Error を投げる", () => {
    expect(() => roundTo(NaN, 2)).toThrow(Error);
    expect(() => roundTo(Infinity, 2)).toThrow(Error);
  });

  test("digits が 0〜10 の整数でなければ Error を投げる", () => {
    expect(() => roundTo(1, 1.5)).toThrow(Error);
    expect(() => roundTo(1, -1)).toThrow(Error);
    expect(() => roundTo(1, 11)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(roundTo).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(roundTo).returns.toEqualTypeOf<number>();
  });
});

describe("percent", () => {
  test("小数第1位までのパーセントを返す", () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(2, 3)).toBe(66.7);
    expect(percent(5, 5)).toBe(100);
    expect(percent(0, 8)).toBe(0);
  });

  test("total が 0 なら Error を投げる", () => {
    expect(() => percent(1, 0)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(percent).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(percent).returns.toEqualTypeOf<number>();
  });
});
