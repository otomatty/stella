// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isWeekend } from "../src/q06-05-is-weekend";
test("問5 isWeekend", () => {
  expect(isWeekend(0)).toBe(true);
  expect(isWeekend(6)).toBe(true);
  expect(isWeekend(3)).toBe(false);
  expectTypeOf(isWeekend).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isWeekend).returns.toEqualTypeOf<boolean>();
});
