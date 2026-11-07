// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { keyCount } from "../src/q08-04-key-count";
test("問4 keyCount", () => {
  expect(keyCount({ a: 1, b: 2 })).toBe(2);
  expect(keyCount({})).toBe(0);
  expectTypeOf(keyCount).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(keyCount).returns.toEqualTypeOf<number>();
});
