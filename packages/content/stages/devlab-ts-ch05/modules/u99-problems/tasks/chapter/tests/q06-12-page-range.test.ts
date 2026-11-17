// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pageRange } from "../src/q06-12-page-range";
test("問12 pageRange", () => {
  expect(pageRange({ page: 3 })).toEqual({ offset: 20, limit: 10 });
  expect(pageRange({})).toEqual({ offset: 0, limit: 10 });
  expect(pageRange({ page: 2, perPage: 5 })).toEqual({ offset: 5, limit: 5 });
  expectTypeOf(pageRange).parameters.toEqualTypeOf<[{ page?: number; perPage?: number }]>();
  expectTypeOf(pageRange).returns.toEqualTypeOf<{ offset: number; limit: number }>();
});
