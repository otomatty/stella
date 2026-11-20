// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maxBy } from "../src/q07-14-max-by";
test("問14 maxBy", () => {
  expect(maxBy(["a", "bcd", "ef"], (w) => w.length)).toBe("bcd");
  expect(maxBy([], (w) => w.length)).toBeUndefined();
  expectTypeOf(maxBy).parameters.toEqualTypeOf<[readonly string[], (w: string) => number]>();
  expectTypeOf(maxBy).returns.toEqualTypeOf<string | undefined>();
});
