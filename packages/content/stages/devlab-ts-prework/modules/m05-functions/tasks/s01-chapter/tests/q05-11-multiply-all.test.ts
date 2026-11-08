// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { multiplyAll } from "../src/q05-11-multiply-all";
test("問11 multiplyAll", () => {
  expect(multiplyAll(2, 3, 4)).toBe(24);
  expect(multiplyAll()).toBe(1);
  expectTypeOf(multiplyAll).parameters.toEqualTypeOf<number[]>();
  expectTypeOf(multiplyAll).returns.toEqualTypeOf<number>();
});
