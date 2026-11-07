// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { LEVELS } from "../src/q07-05-levels";
test("問5 LEVELS", () => {
  expect(LEVELS).toEqual([1, 2, 3]);
  expectTypeOf<typeof LEVELS>().toEqualTypeOf<readonly [1, 2, 3]>();
});
