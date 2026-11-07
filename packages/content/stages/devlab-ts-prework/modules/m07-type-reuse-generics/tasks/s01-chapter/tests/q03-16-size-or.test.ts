// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sizeOr, type Options } from "../src/q03-16-size-or";
test("問16 sizeOr", () => {
  expect(sizeOr({}, 16)).toBe(16);
  expect(sizeOr({ size: 10 }, 16)).toBe(10);
  expectTypeOf(sizeOr).parameters.toEqualTypeOf<[Partial<Options>, number]>();
  expectTypeOf(sizeOr).returns.toEqualTypeOf<number>();
});
