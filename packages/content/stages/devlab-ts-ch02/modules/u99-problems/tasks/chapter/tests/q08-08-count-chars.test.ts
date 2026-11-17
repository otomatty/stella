// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countChars } from "../src/q08-08-count-chars";
test("問8 countChars", () => {
  expect(countChars("banana")).toEqual({ b: 1, a: 3, n: 2 });
  expect(countChars("")).toEqual({});
  expectTypeOf(countChars).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countChars).returns.toEqualTypeOf<{ [char: string]: number }>();
});
