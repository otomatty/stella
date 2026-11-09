// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toPairs } from "../src/q05-15-to-pairs";
test("問15 toPairs", () => {
  expect(toPairs({ a: 1, b: 2 })).toEqual([
    ["a", 1],
    ["b", 2],
  ]);
  expectTypeOf(toPairs).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(toPairs).returns.toEqualTypeOf<[string, number][]>();
});
