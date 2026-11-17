// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { increment } from "../src/q08-06-increment";
test("問6 increment", () => {
  const counts = { a: 1 };
  expect(increment(counts, "a")).toEqual({ a: 2 });
  expect(increment(counts, "b")).toEqual({ a: 1, b: 1 });
  expect(counts).toEqual({ a: 1 });
  expectTypeOf(increment).parameters.toEqualTypeOf<[{ [key: string]: number }, string]>();
  expectTypeOf(increment).returns.toEqualTypeOf<{ [key: string]: number }>();
});
