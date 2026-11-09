// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { monthName } from "../src/q07-14-month-name";
test("問14 monthName", () => {
  expect(monthName(4)).toBe("4月");
  expect(monthName(12)).toBe("12月");
  expect(() => monthName(13)).toThrow(Error);
  expectTypeOf(monthName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(monthName).returns.toEqualTypeOf<string>();
});
