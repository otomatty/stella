import { describe, expect, expectTypeOf, test } from "vitest";
import { factorial } from "../src/e01-bigint";

describe("factorial", () => {
  test("階乗を bigint で返す", () => {
    expect(factorial(0n)).toBe(1n);
    expect(factorial(5n)).toBe(120n);
    expect(factorial(25n)).toBe(15511210043330985984000000n);
  });

  test("負の数なら Error を投げる", () => {
    expect(() => factorial(-1n)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(factorial).parameters.toEqualTypeOf<[bigint]>();
    expectTypeOf(factorial).returns.toEqualTypeOf<bigint>();
  });
});
