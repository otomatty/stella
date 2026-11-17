// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cloneUser, DEFAULT_USER } from "../src/q01-14-clone-user";
test("問14 cloneUser", () => {
  const copied = cloneUser();
  expect(copied).toEqual(DEFAULT_USER);
  expect(copied).not.toBe(DEFAULT_USER);
  expectTypeOf(cloneUser).parameters.toEqualTypeOf<[]>();
  expectTypeOf(cloneUser).returns.toEqualTypeOf<{ name: string; age: number; admin: boolean }>();
});
