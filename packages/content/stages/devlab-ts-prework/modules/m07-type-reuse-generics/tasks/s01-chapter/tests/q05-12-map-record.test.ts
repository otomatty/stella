// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mapRecord } from "../src/q05-12-map-record";
test("問12 mapRecord", () => {
  expect(mapRecord({ a: 1, b: 2 }, (n) => n * 10)).toEqual({ a: 10, b: 20 });
  expectTypeOf(mapRecord).parameters.toEqualTypeOf<
    [Record<string, number>, (n: number) => number]
  >();
  expectTypeOf(mapRecord).returns.toEqualTypeOf<Record<string, number>>();
});
