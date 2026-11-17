// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mapValues } from "../src/q08-11-map-values";
test("問11 mapValues", () => {
  const record: Record<string, number> = { a: 1, b: 2 };
  expect(mapValues(record, (n) => String(n))).toEqual({ a: "1", b: "2" });
  expectTypeOf(mapValues(record, (n) => n > 1)).toEqualTypeOf<Record<string, boolean>>();
});
