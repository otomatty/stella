// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { perPageOf } from "../src/q02-06-per-page-of";
test("問6 perPageOf", () => {
  expect(perPageOf({ perPage: 50 })).toBe(50);
  expect(perPageOf({ perPage: 0 })).toBe(0);
  expect(perPageOf({})).toBe(20);
  expectTypeOf(perPageOf).parameters.toEqualTypeOf<[{ perPage?: number }]>();
  expectTypeOf(perPageOf).returns.toEqualTypeOf<number>();
});
