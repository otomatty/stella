// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { keysOf } from "../src/q08-09-keys-of";
test("問9 keysOf", () => {
  expect(keysOf({ a: 1, b: 2 })).toEqual(["a", "b"]);
  expectTypeOf(keysOf).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(keysOf).returns.toEqualTypeOf<string[]>();
});
