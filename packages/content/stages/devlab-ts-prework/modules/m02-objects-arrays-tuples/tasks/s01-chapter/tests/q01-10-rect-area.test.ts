// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rectArea } from "../src/q01-10-rect-area";
test("問10 rectArea", () => {
  expect(rectArea({ width: 3, height: 4 })).toBe(12);
  expectTypeOf(rectArea).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(rectArea).returns.toEqualTypeOf<number>();
});
