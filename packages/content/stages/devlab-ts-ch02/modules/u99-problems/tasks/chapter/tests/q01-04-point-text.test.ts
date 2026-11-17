// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pointText } from "../src/q01-04-point-text";
test("問4 pointText", () => {
  expect(pointText({ x: 1, y: 2 })).toBe("(1, 2)");
  expect(pointText({ x: -3, y: 0 })).toBe("(-3, 0)");
  expectTypeOf(pointText).parameters.toEqualTypeOf<[{ x: number; y: number }]>();
  expectTypeOf(pointText).returns.toEqualTypeOf<string>();
});
