// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { indexOrNull } from "../src/q03-09-index-or-null";
test("問9 indexOrNull", () => {
  expect(indexOrNull(["a", "b"], "b")).toBe(1);
  expect(indexOrNull(["a", "b"], "c")).toBeNull();
  expectTypeOf(indexOrNull).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(indexOrNull).returns.toEqualTypeOf<number | null>();
});
