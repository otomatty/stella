// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { onlyStrings } from "../src/q09-11-only-strings";
test("問11 onlyStrings", () => {
  expect(onlyStrings(["a", 1, "b"])).toEqual(["a", "b"]);
  expectTypeOf(onlyStrings).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(onlyStrings).returns.toEqualTypeOf<string[]>();
});
