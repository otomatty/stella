// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fromPairs } from "../src/q05-14-from-pairs";
test("問14 fromPairs", () => {
  expect(
    fromPairs([
      ["a", 1],
      ["b", 2],
      ["a", 3],
    ]),
  ).toEqual({ a: 3, b: 2 });
  expectTypeOf(fromPairs).parameters.toEqualTypeOf<[readonly [string, number][]]>();
  expectTypeOf(fromPairs).returns.toEqualTypeOf<Record<string, number>>();
});
