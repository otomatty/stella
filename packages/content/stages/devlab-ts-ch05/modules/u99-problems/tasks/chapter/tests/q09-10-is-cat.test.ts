// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isCat, type Pet } from "../src/q09-10-is-cat";
test("問10 isCat", () => {
  expect(isCat({ kind: "cat", meow: "ニャー" })).toBe(true);
  expect(isCat({ kind: "dog", bark: "ワン" })).toBe(false);
  expectTypeOf(isCat).parameters.toEqualTypeOf<[Pet]>();
  expectTypeOf(isCat).guards.toEqualTypeOf<{ kind: "cat"; meow: string }>();
});
