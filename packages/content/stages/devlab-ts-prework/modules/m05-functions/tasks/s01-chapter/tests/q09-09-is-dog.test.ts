// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isDog, type Pet } from "../src/q09-09-is-dog";
test("問9 isDog", () => {
  expect(isDog({ kind: "dog", bark: "ワン" })).toBe(true);
  expect(isDog({ kind: "cat", meow: "ニャー" })).toBe(false);
  expectTypeOf(isDog).parameters.toEqualTypeOf<[Pet]>();
  expectTypeOf(isDog).guards.toEqualTypeOf<{ kind: "dog"; bark: string }>();
});
