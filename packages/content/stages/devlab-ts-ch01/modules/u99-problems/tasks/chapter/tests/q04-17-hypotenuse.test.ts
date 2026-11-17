// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hypotenuse } from "../src/q04-17-hypotenuse";
test("問17 hypotenuse", () => {
  expect(hypotenuse(3, 4)).toBe(5);
  expect(hypotenuse(5, 12)).toBe(13);
  expectTypeOf(hypotenuse).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(hypotenuse).returns.toEqualTypeOf<number>();
});
