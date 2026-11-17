// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeRect } from "../src/q01-11-make-rect";
test("問11 makeRect", () => {
  expect(makeRect(3, 4)).toEqual({ width: 3, height: 4 });
  expectTypeOf(makeRect).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(makeRect).returns.toEqualTypeOf<{ width: number; height: number }>();
});
