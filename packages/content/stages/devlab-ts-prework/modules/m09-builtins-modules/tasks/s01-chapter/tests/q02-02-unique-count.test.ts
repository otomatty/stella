// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueCount } from "../src/q02-02-unique-count";
test("問2 uniqueCount", () => {
  expect(uniqueCount(["a", "b", "a"])).toBe(2);
  expect(uniqueCount([])).toBe(0);
  expectTypeOf(uniqueCount).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(uniqueCount).returns.toEqualTypeOf<number>();
});
