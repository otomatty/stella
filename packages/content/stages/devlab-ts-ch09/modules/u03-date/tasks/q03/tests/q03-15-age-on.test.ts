// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ageOn } from "../src/q03-15-age-on";
test("問15 ageOn", () => {
  const birthday = new Date(2000, 3, 2);
  expect(ageOn(birthday, new Date(2026, 3, 1))).toBe(25);
  expect(ageOn(birthday, new Date(2026, 3, 2))).toBe(26);
  expect(ageOn(birthday, new Date(2026, 11, 31))).toBe(26);
  expectTypeOf(ageOn).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(ageOn).returns.toEqualTypeOf<number>();
});
