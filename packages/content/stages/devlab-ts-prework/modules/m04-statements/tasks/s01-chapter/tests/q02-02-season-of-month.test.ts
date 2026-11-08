// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { seasonOfMonth } from "../src/q02-02-season-of-month";
test("問2 seasonOfMonth", () => {
  expect(seasonOfMonth(4)).toBe("春");
  expect(seasonOfMonth(8)).toBe("夏");
  expect(seasonOfMonth(9)).toBe("秋");
  expect(seasonOfMonth(1)).toBe("冬");
  expect(() => seasonOfMonth(13)).toThrow(Error);
  expectTypeOf(seasonOfMonth).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(seasonOfMonth).returns.toEqualTypeOf<"春" | "夏" | "秋" | "冬">();
});
