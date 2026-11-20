// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sizeOf } from "../src/q01-08-size-of";
test("問8 sizeOf", () => {
  expect(sizeOf("abc")).toBe(3);
  expect(sizeOf(10)).toBe(10);
  expectTypeOf(sizeOf).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(sizeOf).returns.toEqualTypeOf<number>();
});
