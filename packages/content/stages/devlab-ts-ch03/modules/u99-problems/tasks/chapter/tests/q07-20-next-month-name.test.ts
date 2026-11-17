// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextMonthName } from "../src/q07-20-next-month-name";
test("問20 nextMonthName", () => {
  expect(nextMonthName(4)).toBe("5月");
  expect(nextMonthName(12)).toBe("1月");
  expect(() => nextMonthName(0)).toThrow(Error);
  expectTypeOf(nextMonthName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nextMonthName).returns.toEqualTypeOf<string>();
});
