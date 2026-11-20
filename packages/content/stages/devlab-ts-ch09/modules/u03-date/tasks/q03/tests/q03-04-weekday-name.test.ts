// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { weekdayName } from "../src/q03-04-weekday-name";
test("問4 weekdayName", () => {
  expect(weekdayName(new Date(2026, 3, 1))).toBe("水");
  expect(weekdayName(new Date(2026, 3, 5))).toBe("日");
  expect(weekdayName(new Date(2026, 3, 4))).toBe("土");
  expectTypeOf(weekdayName).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(weekdayName).returns.toEqualTypeOf<string>();
});
