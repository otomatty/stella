// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { seasonOf } from "../src/q07-16-season-of";
test("問16 seasonOf", () => {
  expect(seasonOf(4)).toBe("春");
  expect(seasonOf(8)).toBe("夏");
  expect(seasonOf(11)).toBe("秋");
  expect(seasonOf(1)).toBe("冬");
  expect(seasonOf(12)).toBe("冬");
  expectTypeOf(seasonOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(seasonOf).returns.toEqualTypeOf<"春" | "夏" | "秋" | "冬">();
});
