// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { formatTime } from "../src/q03-09-format-time";
test("問9 formatTime", () => {
  expect(formatTime(new Date(2026, 3, 1, 9, 5))).toBe("09:05");
  expect(formatTime(new Date(2026, 3, 1, 23, 59))).toBe("23:59");
  expectTypeOf(formatTime).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(formatTime).returns.toEqualTypeOf<string>();
});
