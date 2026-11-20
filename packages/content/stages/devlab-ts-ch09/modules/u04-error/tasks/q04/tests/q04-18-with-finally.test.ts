// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withFinally } from "../src/q04-18-with-finally";
test("問18 withFinally", () => {
  const log: string[] = [];
  expect(withFinally(() => 1, log)).toBe(1);
  expect(() =>
    withFinally(() => {
      throw new Error("x");
    }, log),
  ).toThrow("x");
  expect(log).toEqual(["終了", "終了"]);
  expectTypeOf(withFinally).parameters.toEqualTypeOf<[() => number, string[]]>();
  expectTypeOf(withFinally).returns.toEqualTypeOf<number>();
});
