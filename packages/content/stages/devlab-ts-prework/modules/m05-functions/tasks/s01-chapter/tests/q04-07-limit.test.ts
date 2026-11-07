// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { limit } from "../src/q04-07-limit";
test("問7 limit", () => {
  expect(limit(150)).toBe(100);
  expect(limit(-5)).toBe(0);
  expect(limit(15, 0, 10)).toBe(10);
  expectTypeOf(limit).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(limit).returns.toEqualTypeOf<number>();
});
