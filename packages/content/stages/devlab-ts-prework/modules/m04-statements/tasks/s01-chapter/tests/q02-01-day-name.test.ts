// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dayName } from "../src/q02-01-day-name";
test("問1 dayName", () => {
  expect(dayName(0)).toBe("日");
  expect(dayName(1)).toBe("月");
  expect(dayName(6)).toBe("土");
  expect(dayName(7)).toBe("?");
  expectTypeOf(dayName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(dayName).returns.toEqualTypeOf<string>();
});
