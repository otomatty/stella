// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { evensUpTo } from "../src/q03-08-evens-up-to";
test("問8 evensUpTo", () => {
  expect(evensUpTo(7)).toEqual([0, 2, 4, 6]);
  expect(evensUpTo(0)).toEqual([0]);
  expectTypeOf(evensUpTo).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(evensUpTo).returns.toEqualTypeOf<number[]>();
});
