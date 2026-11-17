// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withLog } from "../src/q07-18-with-log";
test("問18 withLog", () => {
  const log: string[] = [];
  expect(withLog(log, (n) => n * 2, 5)).toBe(10);
  expect(log).toEqual(["call(5)"]);
  expectTypeOf(withLog).parameters.toEqualTypeOf<[string[], (n: number) => number, number]>();
  expectTypeOf(withLog).returns.toEqualTypeOf<number>();
});
