// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { assertDefined } from "../src/q09-15-assert-defined";
test("問15 assertDefined", () => {
  expect(() => {
    assertDefined(undefined);
  }).toThrow("値がありません");
  expect(() => {
    assertDefined("a");
  }).not.toThrow();
  expectTypeOf(assertDefined).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(assertDefined).asserts.toEqualTypeOf<string>();
});
