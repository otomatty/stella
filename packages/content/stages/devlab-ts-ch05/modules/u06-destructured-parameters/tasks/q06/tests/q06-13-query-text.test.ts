// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { queryText } from "../src/q06-13-query-text";
test("問13 queryText", () => {
  expect(queryText({ q: "ts" })).toBe("q=ts&limit=10");
  expect(queryText({ q: "ts", limit: 3 })).toBe("q=ts&limit=3");
  expectTypeOf(queryText).parameters.toEqualTypeOf<[{ q: string; limit?: number }]>();
  expectTypeOf(queryText).returns.toEqualTypeOf<string>();
});
