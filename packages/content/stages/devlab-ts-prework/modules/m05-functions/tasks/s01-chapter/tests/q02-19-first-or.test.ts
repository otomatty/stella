// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstOr } from "../src/q02-19-first-or";
test("問19 firstOr", () => {
  expect(firstOr(["a"], "なし")).toBe("a");
  expect(firstOr([], "なし")).toBe("なし");
  expectTypeOf(firstOr).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(firstOr).returns.toEqualTypeOf<string>();
});
