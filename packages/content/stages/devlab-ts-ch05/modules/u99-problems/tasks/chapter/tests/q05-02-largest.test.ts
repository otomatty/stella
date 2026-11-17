// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { largest } from "../src/q05-02-largest";
test("問2 largest", () => {
  expect(largest(3, 9, 2)).toBe(9);
  expect(largest(-1)).toBe(-1);
  expectTypeOf(largest).parameters.toEqualTypeOf<[number, ...number[]]>();
  expectTypeOf(largest).returns.toEqualTypeOf<number>();
});
