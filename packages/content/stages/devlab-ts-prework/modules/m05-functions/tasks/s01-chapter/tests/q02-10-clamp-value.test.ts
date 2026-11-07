// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { clampValue } from "../src/q02-10-clamp-value";
test("問10 clampValue", () => {
  expect(clampValue(15, 0, 10)).toBe(10);
  expect(clampValue(-1, 0, 10)).toBe(0);
  expectTypeOf(clampValue).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(clampValue).returns.toEqualTypeOf<number>();
});
