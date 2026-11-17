// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { swapInPlace } from "../src/q02-08-swap-in-place";
test("問8 swapInPlace", () => {
  const items = ["a", "b", "c"];
  swapInPlace(items, 0, 2);
  expect(items).toEqual(["c", "b", "a"]);
  expect(() => {
    swapInPlace(items, 0, 5);
  }).toThrow(Error);
  expectTypeOf(swapInPlace).parameters.toEqualTypeOf<[string[], number, number]>();
  expectTypeOf(swapInPlace).returns.toBeVoid();
});
