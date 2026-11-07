// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasOwnKey } from "../src/q02-17-has-own-key";
test("問17 hasOwnKey", () => {
  expect(hasOwnKey({ a: 1 }, "a")).toBe(true);
  expect(hasOwnKey({ a: 1 }, "b")).toBe(false);
  expectTypeOf(hasOwnKey).parameters.toEqualTypeOf<[object, string]>();
  expectTypeOf(hasOwnKey).returns.toEqualTypeOf<boolean>();
});
