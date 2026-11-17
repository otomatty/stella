// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { canCross, type Signal } from "../src/q07-04-can-cross";
test("問4 canCross", () => {
  expect(canCross("green")).toBe(true);
  expect(canCross("yellow")).toBe(false);
  expect(canCross("red")).toBe(false);
  expectTypeOf(canCross).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(canCross).returns.toEqualTypeOf<boolean>();
});
