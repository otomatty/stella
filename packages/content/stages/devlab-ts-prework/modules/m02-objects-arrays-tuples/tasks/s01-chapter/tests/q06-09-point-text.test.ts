// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pointText } from "../src/q06-09-point-text";
test("問9 pointText", () => {
  expect(pointText([1, 2])).toBe("(1, 2)");
  expectTypeOf(pointText).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(pointText).returns.toEqualTypeOf<string>();
});
