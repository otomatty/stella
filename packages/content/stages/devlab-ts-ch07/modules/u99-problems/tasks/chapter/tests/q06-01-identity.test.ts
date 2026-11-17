// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { identity } from "../src/q06-01-identity";
test("問1 identity", () => {
  const nums: number[] = [1, 2];
  expect(identity(nums)).toBe(nums);
  expectTypeOf(identity(nums)).toEqualTypeOf<number[]>();
  expectTypeOf(identity(nums.join(""))).toEqualTypeOf<string>();
});
