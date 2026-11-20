// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { splitBy } from "../src/q04-20-split-by";
test("問20 splitBy", () => {
  expect(splitBy("a,b,c")).toEqual(["a", "b", "c"]);
  expect(splitBy("a b", " ")).toEqual(["a", "b"]);
  expectTypeOf(splitBy).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(splitBy).returns.toEqualTypeOf<string[]>();
});
