// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lcm } from "../src/q04-09-lcm";
test("問9 lcm", () => {
  expect(lcm(4, 6)).toBe(12);
  expect(lcm(3, 5)).toBe(15);
  expect(lcm(6, 3)).toBe(6);
  expectTypeOf(lcm).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(lcm).returns.toEqualTypeOf<number>();
});
