// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ymd } from "../src/q06-17-ymd";
test("問17 ymd", () => {
  expect(ymd({ year: 2026, month: 12, day: 4 })).toBe("2026-12-04");
  expectTypeOf(ymd).parameters.toEqualTypeOf<[{ year: number; month: number; day: number }]>();
  expectTypeOf(ymd).returns.toEqualTypeOf<string>();
});
