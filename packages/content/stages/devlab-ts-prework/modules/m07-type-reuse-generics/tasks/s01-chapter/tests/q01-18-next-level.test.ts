// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextLevel } from "../src/q01-18-next-level";
test("問18 nextLevel", () => {
  expect(nextLevel(1)).toBe(2);
  expect(nextLevel(3)).toBe(3);
  expectTypeOf(nextLevel).parameters.toEqualTypeOf<[1 | 2 | 3]>();
  expectTypeOf(nextLevel).returns.toEqualTypeOf<1 | 2 | 3>();
});
