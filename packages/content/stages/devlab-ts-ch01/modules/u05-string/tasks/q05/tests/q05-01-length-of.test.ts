// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lengthOf } from "../src/q05-01-length-of";
test("問1 lengthOf", () => {
  expect(lengthOf("Agora")).toBe(5);
  expect(lengthOf("")).toBe(0);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<number>();
});
