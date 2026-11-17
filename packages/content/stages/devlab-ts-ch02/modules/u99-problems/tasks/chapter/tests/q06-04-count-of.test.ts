// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countOf } from "../src/q06-04-count-of";
test("問4 countOf", () => {
  expect(countOf(["りんご", 3])).toBe(3);
  expectTypeOf(countOf).parameters.toEqualTypeOf<[[string, number]]>();
  expectTypeOf(countOf).returns.toEqualTypeOf<number>();
});
