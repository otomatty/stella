// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { insertAt } from "../src/q05-05-insert-at";
test("問5 insertAt", () => {
  const items = ["a", "c"];
  expect(insertAt(items, 1, "b")).toEqual(["a", "b", "c"]);
  expect(insertAt(items, 0, "z")).toEqual(["z", "a", "c"]);
  expect(items).toEqual(["a", "c"]);
  expectTypeOf(insertAt).parameters.toEqualTypeOf<[readonly string[], number, string]>();
  expectTypeOf(insertAt).returns.toEqualTypeOf<string[]>();
});
