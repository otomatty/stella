// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeColor } from "../src/q01-19-make-color";
test("問19 makeColor", () => {
  expect(makeColor(0, 128, 255)).toEqual({ r: 0, g: 128, b: 255 });
  expectTypeOf(makeColor).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(makeColor).returns.toEqualTypeOf<{ r: number; g: number; b: number }>();
});
