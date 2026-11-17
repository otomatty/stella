// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { reversed } from "../src/q05-11-reversed";
test("問11 reversed", () => {
  const items = ["a", "b", "c"];
  expect(reversed(items)).toEqual(["c", "b", "a"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(reversed).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(reversed).returns.toEqualTypeOf<string[]>();
});
