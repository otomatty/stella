import { describe, expect, expectTypeOf, test } from "vitest";
import { grade, shippingCost, ticketPrice } from "../src/q01-if-else";

describe("grade", () => {
  test("点数ごとの評価を返す", () => {
    expect(grade(100)).toBe("秀");
    expect(grade(90)).toBe("秀");
    expect(grade(89)).toBe("優");
    expect(grade(70)).toBe("良");
    expect(grade(60)).toBe("可");
    expect(grade(0)).toBe("不可");
  });

  test("0〜100 の整数でなければ Error を投げる", () => {
    expect(() => grade(101)).toThrow(Error);
    expect(() => grade(-1)).toThrow(Error);
    expect(() => grade(80.5)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(grade).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(grade).returns.toEqualTypeOf<"秀" | "優" | "良" | "可" | "不可">();
  });
});

describe("shippingCost", () => {
  test("重さで送料が変わる", () => {
    expect(shippingCost(2, "本州")).toBe(800);
    expect(shippingCost(2.1, "本州")).toBe(1200);
    expect(shippingCost(5, "本州")).toBe(1200);
    expect(shippingCost(10, "本州")).toBe(2000);
  });

  test("北海道と沖縄は 500円を足す", () => {
    expect(shippingCost(1, "北海道")).toBe(1300);
    expect(shippingCost(10, "沖縄")).toBe(2500);
  });

  test("0 以下なら Error を投げる", () => {
    expect(() => shippingCost(0, "本州")).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(shippingCost).parameters.toEqualTypeOf<[number, "本州" | "北海道" | "沖縄"]>();
    expectTypeOf(shippingCost).returns.toEqualTypeOf<number>();
  });
});

describe("ticketPrice", () => {
  test("年齢ごとの入場料（休日）", () => {
    expect(ticketPrice(5, false)).toBe(0);
    expect(ticketPrice(6, false)).toBe(500);
    expect(ticketPrice(12, false)).toBe(500);
    expect(ticketPrice(30, false)).toBe(1500);
    expect(ticketPrice(65, false)).toBe(800);
  });

  test("平日は100円引き。0円は0円のまま", () => {
    expect(ticketPrice(30, true)).toBe(1400);
    expect(ticketPrice(10, true)).toBe(400);
    expect(ticketPrice(3, true)).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(ticketPrice).parameters.toEqualTypeOf<[number, boolean]>();
    expectTypeOf(ticketPrice).returns.toEqualTypeOf<number>();
  });
});
