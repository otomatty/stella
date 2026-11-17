// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { powerOf } from "../src/q04-02-power-of";
test("問2 powerOf", () => {
  expect(powerOf(3)).toBe(9);
  expect(powerOf(2, 10)).toBe(1024);
  expectTypeOf(powerOf).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(powerOf).returns.toEqualTypeOf<number>();
});
