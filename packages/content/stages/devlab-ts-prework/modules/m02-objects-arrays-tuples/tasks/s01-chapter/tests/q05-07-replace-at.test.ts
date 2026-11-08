// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { replaceAt } from "../src/q05-07-replace-at";
test("問7 replaceAt", () => {
  const items = ["a", "b", "c"];
  expect(replaceAt(items, 1, "x")).toEqual(["a", "x", "c"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(replaceAt).parameters.toEqualTypeOf<[readonly string[], number, string]>();
  expectTypeOf(replaceAt).returns.toEqualTypeOf<string[]>();
});
