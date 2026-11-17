// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { combine } from "../src/q03-19-combine";
test("問19 combine", () => {
  expect(combine({ x: 1 }, { y: 2 })).toEqual({ x: 1, y: 2 });
  expectTypeOf(combine).parameters.toEqualTypeOf<[{ x: number }, { y: number }]>();
  expectTypeOf(combine).returns.toEqualTypeOf<{ x: number; y: number }>();
});
