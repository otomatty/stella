// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { invert } from "../src/q08-11-invert";
test("問11 invert", () => {
  expect(invert({ a: "x", b: "y" })).toEqual({ x: "a", y: "b" });
  expectTypeOf(invert).parameters.toEqualTypeOf<[{ [key: string]: string }]>();
  expectTypeOf(invert).returns.toEqualTypeOf<{ [value: string]: string }>();
});
