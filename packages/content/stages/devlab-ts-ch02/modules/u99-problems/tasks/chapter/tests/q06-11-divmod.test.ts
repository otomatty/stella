// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { divmod } from "../src/q06-11-divmod";
test("問11 divmod", () => {
  expect(divmod(17, 5)).toEqual([3, 2]);
  expect(divmod(10, 5)).toEqual([2, 0]);
  expectTypeOf(divmod).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(divmod).returns.toEqualTypeOf<[number, number]>();
});
