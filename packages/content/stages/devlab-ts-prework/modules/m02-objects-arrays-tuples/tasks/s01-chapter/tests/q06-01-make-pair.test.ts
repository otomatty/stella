// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makePair } from "../src/q06-01-make-pair";
test("問1 makePair", () => {
  expect(makePair("りんご", 3)).toEqual(["りんご", 3]);
  expectTypeOf(makePair).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makePair).returns.toEqualTypeOf<[string, number]>();
});
