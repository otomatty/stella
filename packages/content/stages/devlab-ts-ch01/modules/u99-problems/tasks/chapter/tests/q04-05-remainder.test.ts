// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { remainder } from "../src/q04-05-remainder";
test("問5 remainder", () => {
  expect(remainder(10, 3)).toBe(1);
  expect(remainder(9, 3)).toBe(0);
  expectTypeOf(remainder).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(remainder).returns.toEqualTypeOf<number>();
});
