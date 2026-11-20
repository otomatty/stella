// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { clamp } from "../src/q04-09-clamp";
test("問9 clamp", () => {
  expect(clamp(15, 0, 10)).toBe(10);
  expect(clamp(-5, 0, 10)).toBe(0);
  expect(clamp(5, 0, 10)).toBe(5);
  expectTypeOf(clamp).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(clamp).returns.toEqualTypeOf<number>();
});
