// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { swapPair } from "../src/q06-07-swap-pair";
test("問7 swapPair", () => {
  const pair: [string, number] = ["a", 1];
  expect(swapPair(pair)).toEqual([1, "a"]);
  expectTypeOf(swapPair(pair)).toEqualTypeOf<[number, string]>();
});
