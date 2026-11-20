// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cubeOf } from "../src/q01-02-cube-of";
test("問2 cubeOf", () => {
  expect(cubeOf(3)).toBe(27);
  expect(cubeOf(-2)).toBe(-8);
  expectTypeOf(cubeOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(cubeOf).returns.toEqualTypeOf<number>();
});
