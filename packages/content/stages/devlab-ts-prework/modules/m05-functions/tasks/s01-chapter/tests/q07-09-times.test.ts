// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { times } from "../src/q07-09-times";
test("問9 times", () => {
  const calls: number[] = [];
  times(3, (i) => {
    calls.push(i);
  });
  expect(calls).toEqual([0, 1, 2]);
  expectTypeOf(times).parameters.toEqualTypeOf<[number, (i: number) => void]>();
  expectTypeOf(times).returns.toBeVoid();
});
