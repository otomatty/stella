// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isEmpty } from "../src/q08-10-is-empty";
test("問10 isEmpty", () => {
  expect(isEmpty("")).toBe(true);
  expect(isEmpty("a")).toBe(false);
  expectTypeOf(isEmpty).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isEmpty).returns.toEqualTypeOf<boolean>();
});
