// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { removeKey } from "../src/q08-13-remove-key";
test("問13 removeKey", () => {
  const record = { a: 1, b: 2 };
  expect(removeKey(record, "a")).toEqual({ b: 2 });
  expect(record).toEqual({ a: 1, b: 2 });
  expectTypeOf(removeKey).parameters.toEqualTypeOf<[{ [key: string]: number }, string]>();
  expectTypeOf(removeKey).returns.toEqualTypeOf<{ [key: string]: number }>();
});
