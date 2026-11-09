// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { areaOf } from "../src/q06-02-area-of";
test("問2 areaOf", () => {
  expect(areaOf({ width: 3, height: 4 })).toBe(12);
  expectTypeOf(areaOf).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(areaOf).returns.toEqualTypeOf<number>();
});
