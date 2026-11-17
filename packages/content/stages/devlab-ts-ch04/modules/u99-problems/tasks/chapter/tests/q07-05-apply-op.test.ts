// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { applyOp, type Op } from "../src/q07-05-apply-op";
test("問5 applyOp", () => {
  expect(applyOp("add", 3, 4)).toBe(7);
  expect(applyOp("sub", 3, 4)).toBe(-1);
  expect(applyOp("mul", 3, 4)).toBe(12);
  expectTypeOf(applyOp).parameters.toEqualTypeOf<[Op, number, number]>();
  expectTypeOf(applyOp).returns.toEqualTypeOf<number>();
});
