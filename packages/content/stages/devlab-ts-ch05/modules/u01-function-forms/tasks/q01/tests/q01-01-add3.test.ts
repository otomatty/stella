// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { add3 } from "../src/q01-01-add3";
test("問1 add3", () => {
  expect(add3(1, 2, 3)).toBe(6);
  expectTypeOf(add3).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(add3).returns.toEqualTypeOf<number>();
});
