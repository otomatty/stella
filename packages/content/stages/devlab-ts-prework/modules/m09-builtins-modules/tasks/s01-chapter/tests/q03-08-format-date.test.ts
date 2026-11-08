// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { formatDate } from "../src/q03-08-format-date";
test("問8 formatDate", () => {
  expect(formatDate(new Date(2026, 3, 1))).toBe("2026-04-01");
  expect(formatDate(new Date(2026, 11, 25))).toBe("2026-12-25");
  expectTypeOf(formatDate).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(formatDate).returns.toEqualTypeOf<string>();
});
