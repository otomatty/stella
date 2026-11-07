// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { without } from "../src/q05-13-without";
test("問13 without", () => {
  const items = ["a", "b", "a"];
  expect(without(items, "a")).toEqual(["b"]);
  expect(items).toEqual(["a", "b", "a"]);
  expectTypeOf(without).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(without).returns.toEqualTypeOf<string[]>();
});
