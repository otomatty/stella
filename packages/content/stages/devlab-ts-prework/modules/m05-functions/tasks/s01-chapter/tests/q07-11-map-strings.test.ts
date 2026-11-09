// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mapStrings } from "../src/q07-11-map-strings";
test("問11 mapStrings", () => {
  expect(mapStrings(["a", "b"], (s) => s.toUpperCase())).toEqual(["A", "B"]);
  expectTypeOf(mapStrings).parameters.toEqualTypeOf<[readonly string[], (s: string) => string]>();
  expectTypeOf(mapStrings).returns.toEqualTypeOf<string[]>();
});
