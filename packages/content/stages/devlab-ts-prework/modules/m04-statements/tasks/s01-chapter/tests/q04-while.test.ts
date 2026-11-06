import { describe, expect, expectTypeOf, test } from "vitest";
import { firstPowerOver, sumUntilNegative, toBinary } from "../src/q04-while";

describe("toBinary", () => {
  test("2進数の文字列にする", () => {
    expect(toBinary(10)).toBe("1010");
    expect(toBinary(1)).toBe("1");
    expect(toBinary(0)).toBe("0");
    expect(toBinary(255)).toBe("11111111");
  });

  test("負の数か整数でなければ Error を投げる", () => {
    expect(() => toBinary(-1)).toThrow(Error);
    expect(() => toBinary(1.5)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(toBinary).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(toBinary).returns.toEqualTypeOf<string>();
  });
});

describe("firstPowerOver", () => {
  test("limit を初めて超えた累乗を返す", () => {
    expect(firstPowerOver(2, 100)).toBe(128);
    expect(firstPowerOver(3, 9)).toBe(27);
    expect(firstPowerOver(10, 0)).toBe(10);
  });

  test("base が 2 未満なら Error を投げる", () => {
    expect(() => firstPowerOver(1, 10)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(firstPowerOver).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(firstPowerOver).returns.toEqualTypeOf<number>();
  });
});

describe("sumUntilNegative", () => {
  test("負の数で止め、0 は飛ばす", () => {
    expect(sumUntilNegative([3, 0, 4, -1, 5])).toEqual({ sum: 7, count: 2 });
    expect(sumUntilNegative([1, 2, 3])).toEqual({ sum: 6, count: 3 });
    expect(sumUntilNegative([-1, 2])).toEqual({ sum: 0, count: 0 });
    expect(sumUntilNegative([])).toEqual({ sum: 0, count: 0 });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sumUntilNegative).parameters.toEqualTypeOf<[readonly number[]]>();
    expectTypeOf(sumUntilNegative).returns.toEqualTypeOf<{ sum: number; count: number }>();
  });
});
