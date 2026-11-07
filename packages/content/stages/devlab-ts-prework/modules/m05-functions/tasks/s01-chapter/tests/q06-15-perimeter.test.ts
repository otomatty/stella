// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { perimeter } from "../src/q06-15-perimeter";
test("問15 perimeter", () => {
  expect(perimeter({ width: 3, height: 4 })).toBe(14);
  expectTypeOf(perimeter).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(perimeter).returns.toEqualTypeOf<number>();
});
