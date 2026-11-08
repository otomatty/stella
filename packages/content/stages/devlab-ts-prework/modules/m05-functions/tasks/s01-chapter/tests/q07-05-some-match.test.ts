// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { someMatch } from "../src/q07-05-some-match";
test("問5 someMatch", () => {
  expect(someMatch([1, 3], (n) => n > 2)).toBe(true);
  expect(someMatch([1, 2], (n) => n > 2)).toBe(false);
  expectTypeOf(someMatch).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(someMatch).returns.toEqualTypeOf<boolean>();
});
