// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pickKeys } from "../src/q08-12-pick-keys";
test("問12 pickKeys", () => {
  expect(pickKeys({ a: 1, b: 2, c: 3 }, ["a", "c", "z"])).toEqual({ a: 1, c: 3 });
  expectTypeOf(pickKeys).parameters.toEqualTypeOf<[{ [key: string]: number }, readonly string[]]>();
  expectTypeOf(pickKeys).returns.toEqualTypeOf<{ [key: string]: number }>();
});
