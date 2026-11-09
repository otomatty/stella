// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isEmpty } from "../src/q06-11-is-empty";
test("問11 isEmpty", () => {
  expect(isEmpty("")).toBe(true);
  expect(isEmpty(" ")).toBe(false);
  expectTypeOf(isEmpty).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isEmpty).returns.toEqualTypeOf<boolean>();
});
