// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { keyCount } from "../src/q02-16-key-count";
test("問16 keyCount", () => {
  expect(keyCount({ a: 1, b: 2 })).toBe(2);
  expect(keyCount({})).toBe(0);
  expectTypeOf(keyCount).parameters.toEqualTypeOf<[object]>();
  expectTypeOf(keyCount).returns.toEqualTypeOf<number>();
});
