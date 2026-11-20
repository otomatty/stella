// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pointText } from "../src/q06-04-point-text";
test("問4 pointText", () => {
  expect(pointText({ x: 3 })).toBe("(3, 0)");
  expect(pointText({})).toBe("(0, 0)");
  expectTypeOf(pointText).parameters.toEqualTypeOf<[{ x?: number; y?: number }]>();
  expectTypeOf(pointText).returns.toEqualTypeOf<string>();
});
