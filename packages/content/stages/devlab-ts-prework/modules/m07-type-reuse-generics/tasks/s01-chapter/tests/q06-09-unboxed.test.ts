// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { unboxed } from "../src/q06-09-unboxed";
test("問9 unboxed", () => {
  const box: { value: number[] } = { value: [1] };
  expect(unboxed({ value: "a" })).toBe("a");
  expectTypeOf(unboxed(box)).toEqualTypeOf<number[]>();
});
