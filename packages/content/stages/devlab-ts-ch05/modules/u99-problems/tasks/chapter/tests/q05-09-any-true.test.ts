// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { anyTrue } from "../src/q05-09-any-true";
test("問9 anyTrue", () => {
  expect(anyTrue(false, true)).toBe(true);
  expect(anyTrue(false)).toBe(false);
  expect(anyTrue()).toBe(false);
  expectTypeOf(anyTrue).parameters.toEqualTypeOf<boolean[]>();
  expectTypeOf(anyTrue).returns.toEqualTypeOf<boolean>();
});
