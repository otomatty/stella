// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parityLabel } from "../src/q01-18-parity-label";
test("問18 parityLabel", () => {
  expect(parityLabel(4)).toBe("偶数");
  expect(parityLabel(7)).toBe("奇数");
  expectTypeOf(parityLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(parityLabel).returns.toEqualTypeOf<"偶数" | "奇数">();
});
