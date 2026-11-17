// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { evaluate } from "../src/q08-16-evaluate";
test("問16 evaluate", () => {
  expect(evaluate("3 + 4")).toBe(7);
  expect(evaluate(" 6 / 3 ")).toBe(2);
  expect(() => evaluate("6 / 0")).toThrow("0で割ることはできません");
  expect(() => evaluate("6 ^ 2")).toThrow("式ではありません: 6 ^ 2");
  expect(() => evaluate("x + 1")).toThrow("式ではありません: x + 1");
  expectTypeOf(evaluate).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(evaluate).returns.toEqualTypeOf<number>();
});
