// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countWhere } from "../src/q07-04-count-where";
test("問4 countWhere", () => {
  expect(countWhere(["a", "bb", "ccc"], (s) => s.length > 1)).toBe(2);
  expectTypeOf(countWhere).parameters.toEqualTypeOf<[readonly string[], (s: string) => boolean]>();
  expectTypeOf(countWhere).returns.toEqualTypeOf<number>();
});
