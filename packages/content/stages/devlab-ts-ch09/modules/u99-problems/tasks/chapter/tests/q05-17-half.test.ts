// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { half } from "../src/q05-17-half";
test("問17 half", () => {
  expect(half(5)).toBe(2.5);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});
