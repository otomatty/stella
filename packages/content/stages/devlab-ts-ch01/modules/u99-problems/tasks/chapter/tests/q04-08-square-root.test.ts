// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { squareRoot } from "../src/q04-08-square-root";
test("問8 squareRoot", () => {
  expect(squareRoot(9)).toBe(3);
  expect(squareRoot(2)).toBeCloseTo(1.41421);
  expect(() => squareRoot(-1)).toThrow(Error);
  expectTypeOf(squareRoot).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(squareRoot).returns.toEqualTypeOf<number>();
});
