// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { applyTwice } from "../src/q07-12-apply-twice";
test("問12 applyTwice", () => {
  expect(applyTwice((n) => n + 3, 1)).toBe(7);
  expect(applyTwice((n) => n * n, 3)).toBe(81);
  expectTypeOf(applyTwice).parameters.toEqualTypeOf<[(n: number) => number, number]>();
  expectTypeOf(applyTwice).returns.toEqualTypeOf<number>();
});
