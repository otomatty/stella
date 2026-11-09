// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseDateParts } from "../src/q08-05-parse-date-parts";
test("問5 parseDateParts", () => {
  expect(parseDateParts("2026-12-01")).toEqual([2026, 12, 1]);
  expect(() => parseDateParts("2026/12/01")).toThrow("日付ではありません: 2026/12/01");
  expect(() => parseDateParts("2026-12-xx")).toThrow("日付ではありません: 2026-12-xx");
  expectTypeOf(parseDateParts).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseDateParts).returns.toEqualTypeOf<[number, number, number]>();
});
