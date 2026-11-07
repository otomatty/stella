// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { absDiff } from "../src/q04-04-abs-diff";
test("問4 absDiff", () => {
  expect(absDiff(3, 10)).toBe(7);
  expect(absDiff(10, 3)).toBe(7);
  expectTypeOf(absDiff).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(absDiff).returns.toEqualTypeOf<number>();
});
