// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sign } from "../src/q03-08-sign";
test("問8 sign", () => {
  expect(sign(5)).toBe("plus");
  expect(sign(-3)).toBe("minus");
  expect(sign(0)).toBe("zero");
  expectTypeOf(sign).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(sign).returns.toEqualTypeOf<"plus" | "minus" | "zero">();
});
