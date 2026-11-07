// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lengthOf } from "../src/q08-03-length-of";
test("問3 lengthOf", () => {
  expect(lengthOf("abc")).toBe(3);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<number>();
});
