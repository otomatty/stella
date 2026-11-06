import { describe, expect, expectTypeOf, test } from "vitest";
import { addPrices, multiplyPrice } from "../src/e02-decimal";

describe("addPrices", () => {
  test("誤差なく足す", () => {
    expect(addPrices(0.1, 0.2)).toBe(0.3);
    expect(addPrices(19.99, 0.01)).toBe(20);
    expect(addPrices(1.15, 2.3)).toBe(3.45);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(addPrices).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(addPrices).returns.toEqualTypeOf<number>();
  });
});

describe("multiplyPrice", () => {
  test("誤差なく掛ける", () => {
    expect(multiplyPrice(0.1, 3)).toBe(0.3);
    expect(multiplyPrice(19.99, 3)).toBe(59.97);
    expect(multiplyPrice(1.15, 100)).toBe(115);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(multiplyPrice).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(multiplyPrice).returns.toEqualTypeOf<number>();
  });
});
