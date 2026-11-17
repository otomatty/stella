// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rollAgain } from "../src/q07-12-roll-again";
test("問12 rollAgain", () => {
  expect(rollAgain(6)).toBe(true);
  expect(rollAgain(1)).toBe(false);
  expectTypeOf(rollAgain).parameters.toEqualTypeOf<[1 | 2 | 3 | 4 | 5 | 6]>();
  expectTypeOf(rollAgain).returns.toEqualTypeOf<boolean>();
});
