// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { either } from "../src/q06-09-either";
test("問9 either", () => {
  expect(either(false, true)).toBe(true);
  expect(either(false, false)).toBe(false);
  expectTypeOf(either).parameters.toEqualTypeOf<[boolean, boolean]>();
  expectTypeOf(either).returns.toEqualTypeOf<boolean>();
});
