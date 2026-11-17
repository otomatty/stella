// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { half } from "../src/q08-06-half";
test("問6 half", () => {
  expect(half(9)).toBe(4.5);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});
