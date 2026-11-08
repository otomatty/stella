// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orDefault } from "../src/q03-03-or-default";
test("問3 orDefault", () => {
  expect(orDefault(3, 10)).toBe(3);
  expect(orDefault(0, 10)).toBe(0);
  expect(orDefault(undefined, 10)).toBe(10);
  expectTypeOf(orDefault).parameters.toEqualTypeOf<[number | undefined, number]>();
  expectTypeOf(orDefault).returns.toEqualTypeOf<number>();
});
