// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { boxOf, type Box } from "../src/q06-08-box-of";
test("問8 boxOf", () => {
  const words: string[] = ["a"];
  expect(boxOf(5)).toEqual({ value: 5 });
  expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
  expectTypeOf(boxOf(words)).toEqualTypeOf<Box<string[]>>();
});
