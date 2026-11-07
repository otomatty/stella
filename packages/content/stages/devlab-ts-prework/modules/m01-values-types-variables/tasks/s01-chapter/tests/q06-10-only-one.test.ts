// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { onlyOne } from "../src/q06-10-only-one";
test("問10 onlyOne", () => {
  expect(onlyOne(true, false)).toBe(true);
  expect(onlyOne(false, true)).toBe(true);
  expect(onlyOne(true, true)).toBe(false);
  expect(onlyOne(false, false)).toBe(false);
  expectTypeOf(onlyOne).parameters.toEqualTypeOf<[boolean, boolean]>();
  expectTypeOf(onlyOne).returns.toEqualTypeOf<boolean>();
});
