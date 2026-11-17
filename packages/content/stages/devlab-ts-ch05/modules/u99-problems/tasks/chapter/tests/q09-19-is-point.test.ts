// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPoint } from "../src/q09-19-is-point";
test("問19 isPoint", () => {
  expect(isPoint({ x: 1, y: 2 })).toBe(true);
  expect(isPoint({ x: 1 })).toBe(false);
  expectTypeOf(isPoint).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isPoint).guards.toEqualTypeOf<{ x: number; y: number }>();
});
