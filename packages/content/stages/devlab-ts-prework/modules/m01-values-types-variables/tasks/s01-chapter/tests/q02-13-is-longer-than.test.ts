// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isLongerThan } from "../src/q02-13-is-longer-than";
test("問13 isLongerThan", () => {
  expect(isLongerThan("hello", 3)).toBe(true);
  expect(isLongerThan("hi", 2)).toBe(false);
  expectTypeOf(isLongerThan).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(isLongerThan).returns.toEqualTypeOf<boolean>();
});
