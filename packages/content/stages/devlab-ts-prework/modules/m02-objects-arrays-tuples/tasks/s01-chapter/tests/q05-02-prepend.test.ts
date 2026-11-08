// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { prepend } from "../src/q05-02-prepend";
test("問2 prepend", () => {
  const items = ["b", "c"];
  expect(prepend(items, "a")).toEqual(["a", "b", "c"]);
  expect(items).toEqual(["b", "c"]);
  expectTypeOf(prepend).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(prepend).returns.toEqualTypeOf<string[]>();
});
