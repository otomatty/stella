// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { subtract } from "../src/q02-01-subtract";
test("問1 subtract", () => {
  expect(subtract(5, 3)).toBe(2);
  expect(subtract(0, 7)).toBe(-7);
  expectTypeOf(subtract).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(subtract).returns.toEqualTypeOf<number>();
});
