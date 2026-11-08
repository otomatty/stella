// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toSet } from "../src/q02-01-to-set";
test("問1 toSet", () => {
  expect([...toSet(["a", "b", "a"])]).toEqual(["a", "b"]);
  expectTypeOf(toSet).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(toSet).returns.toEqualTypeOf<Set<string>>();
});
