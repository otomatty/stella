// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeCounterFrom } from "../src/q08-05-make-counter-from";
test("問5 makeCounterFrom", () => {
  const next = makeCounterFrom(10);
  expect(next()).toBe(10);
  expect(next()).toBe(11);
  expectTypeOf(makeCounterFrom).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeCounterFrom).returns.toEqualTypeOf<() => number>();
});
