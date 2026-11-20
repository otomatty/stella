// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { IS_BETA } from "../src/q03-03-is-beta";
test("問3 IS_BETA", () => {
  expect(IS_BETA).toBe(true);
  expectTypeOf<typeof IS_BETA>().toEqualTypeOf<true>();
});
