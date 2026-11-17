// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { filterRecord } from "../src/q05-13-filter-record";
test("問13 filterRecord", () => {
  expect(filterRecord({ a: 1, b: 5 }, 3)).toEqual({ b: 5 });
  expectTypeOf(filterRecord).parameters.toEqualTypeOf<[Record<string, number>, number]>();
  expectTypeOf(filterRecord).returns.toEqualTypeOf<Record<string, number>>();
});
