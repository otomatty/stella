// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isOrigin } from "../src/q06-16-is-origin";
test("問16 isOrigin", () => {
  expect(isOrigin([0, 0])).toBe(true);
  expect(isOrigin([0, 1])).toBe(false);
  expectTypeOf(isOrigin).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(isOrigin).returns.toEqualTypeOf<boolean>();
});
