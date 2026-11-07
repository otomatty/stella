// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasKey } from "../src/q08-02-has-key";
test("問2 hasKey", () => {
  expect(hasKey({ a: "x" }, "a")).toBe(true);
  expect(hasKey({ a: "x" }, "b")).toBe(false);
  expectTypeOf(hasKey).parameters.toEqualTypeOf<[{ [key: string]: string }, string]>();
  expectTypeOf(hasKey).returns.toEqualTypeOf<boolean>();
});
