// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { resetCounter } from "../src/q02-06-reset-counter";
test("問6 resetCounter", () => {
  const counter = { count: 5 };
  resetCounter(counter);
  expect(counter.count).toBe(0);
  expectTypeOf(resetCounter).parameters.toEqualTypeOf<[{ count: number }]>();
  expectTypeOf(resetCounter).returns.toBeVoid();
});
