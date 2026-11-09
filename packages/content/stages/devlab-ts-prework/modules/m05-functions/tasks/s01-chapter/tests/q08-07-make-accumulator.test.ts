// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeAccumulator } from "../src/q08-07-make-accumulator";
test("問7 makeAccumulator", () => {
  const add = makeAccumulator();
  expect(add(5)).toBe(5);
  expect(add(3)).toBe(8);
  expectTypeOf(makeAccumulator).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeAccumulator).returns.toEqualTypeOf<(n: number) => number>();
});
