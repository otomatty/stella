// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeTimes } from "../src/q08-02-make-times";
test("問2 makeTimes", () => {
  expect(makeTimes(2)(5)).toBe(10);
  expectTypeOf(makeTimes).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeTimes).returns.toEqualTypeOf<(x: number) => number>();
});
