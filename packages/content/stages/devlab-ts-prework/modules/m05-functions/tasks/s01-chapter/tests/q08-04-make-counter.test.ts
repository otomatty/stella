// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeCounter } from "../src/q08-04-make-counter";
test("問4 makeCounter", () => {
  const next = makeCounter();
  expect(next()).toBe(1);
  expect(next()).toBe(2);
  expect(makeCounter()()).toBe(1);
  expectTypeOf(makeCounter).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeCounter).returns.toEqualTypeOf<() => number>();
});
