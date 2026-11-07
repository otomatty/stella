// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { everyMatch } from "../src/q07-06-every-match";
test("問6 everyMatch", () => {
  expect(everyMatch([2, 4], (n) => n % 2 === 0)).toBe(true);
  expect(everyMatch([2, 3], (n) => n % 2 === 0)).toBe(false);
  expect(everyMatch([], () => false)).toBe(true);
  expectTypeOf(everyMatch).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(everyMatch).returns.toEqualTypeOf<boolean>();
});
