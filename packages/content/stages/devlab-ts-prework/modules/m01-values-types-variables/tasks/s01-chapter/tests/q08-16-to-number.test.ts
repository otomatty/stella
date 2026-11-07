// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toNumber } from "../src/q08-16-to-number";
test("問16 toNumber", () => {
  expect(toNumber("42")).toBe(42);
  expectTypeOf(toNumber).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toNumber).returns.toEqualTypeOf<number>();
});
