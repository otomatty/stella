// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { append } from "../src/q05-01-append";
test("問1 append", () => {
  const items = ["a", "b"];
  expect(append(items, "c")).toEqual(["a", "b", "c"]);
  expect(items).toEqual(["a", "b"]);
  expectTypeOf(append).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(append).returns.toEqualTypeOf<string[]>();
});
