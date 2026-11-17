// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { area } from "../src/q08-08-area";
test("問8 area", () => {
  expect(area(3, 4)).toBe(12);
  expectTypeOf(area).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(area).returns.toEqualTypeOf<number>();
});
