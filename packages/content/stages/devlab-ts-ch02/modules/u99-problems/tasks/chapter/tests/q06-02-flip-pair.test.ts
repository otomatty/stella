// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { flipPair } from "../src/q06-02-flip-pair";
test("問2 flipPair", () => {
  expect(flipPair([3, "りんご"])).toEqual(["りんご", 3]);
  expectTypeOf(flipPair).parameters.toEqualTypeOf<[[number, string]]>();
  expectTypeOf(flipPair).returns.toEqualTypeOf<[string, number]>();
});
