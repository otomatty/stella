// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeOptions } from "../src/q04-12-make-options";
test("問12 makeOptions", () => {
  expect(makeOptions()).toEqual({ size: "M", color: "black" });
  expect(makeOptions("L")).toEqual({ size: "L", color: "black" });
  expectTypeOf(makeOptions).parameters.toEqualTypeOf<[string?, string?]>();
  expectTypeOf(makeOptions).returns.toEqualTypeOf<{ size: string; color: string }>();
});
