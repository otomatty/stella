// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countArgs } from "../src/q05-05-count-args";
test("問5 countArgs", () => {
  expect(countArgs(1, "a", null)).toBe(3);
  expect(countArgs()).toBe(0);
  expectTypeOf(countArgs).parameters.toEqualTypeOf<unknown[]>();
  expectTypeOf(countArgs).returns.toEqualTypeOf<number>();
});
