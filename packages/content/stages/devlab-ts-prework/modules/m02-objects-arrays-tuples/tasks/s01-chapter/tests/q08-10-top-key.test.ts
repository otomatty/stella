// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { topKey } from "../src/q08-10-top-key";
test("問10 topKey", () => {
  expect(topKey({ a: 1, b: 3, c: 2 })).toBe("b");
  expect(topKey({ a: 3, b: 3 })).toBe("a");
  expect(topKey({})).toBeUndefined();
  expectTypeOf(topKey).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(topKey).returns.toEqualTypeOf<string | undefined>();
});
