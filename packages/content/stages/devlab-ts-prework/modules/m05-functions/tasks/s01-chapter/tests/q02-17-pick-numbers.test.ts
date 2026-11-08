// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pickNumbers } from "../src/q02-17-pick-numbers";
test("問17 pickNumbers", () => {
  expect(pickNumbers([1, "a", 2])).toEqual([1, 2]);
  expectTypeOf(pickNumbers).parameters.toEqualTypeOf<[readonly (string | number)[]]>();
  expectTypeOf(pickNumbers).returns.toEqualTypeOf<number[]>();
});
