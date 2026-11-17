// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rectangleArea } from "../src/q02-05-rectangle-area";
test("問5 rectangleArea", () => {
  expect(rectangleArea(3, 4)).toBe(12);
  expect(rectangleArea(10, 0)).toBe(0);
  expectTypeOf(rectangleArea).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(rectangleArea).returns.toEqualTypeOf<number>();
});
