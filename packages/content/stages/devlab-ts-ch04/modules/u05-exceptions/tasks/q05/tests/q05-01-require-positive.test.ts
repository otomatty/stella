// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { requirePositive } from "../src/q05-01-require-positive";
test("問1 requirePositive", () => {
  expect(requirePositive(3)).toBe(3);
  expect(() => requirePositive(0)).toThrow("正の数が必要です");
  expectTypeOf(requirePositive).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(requirePositive).returns.toEqualTypeOf<number>();
});
