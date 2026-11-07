// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countFilled } from "../src/q02-11-count-filled";
test("問11 countFilled", () => {
  expect(countFilled({ a: "x", c: "z" })).toBe(2);
  expect(countFilled({})).toBe(0);
  expect(countFilled({ a: "", b: "", c: "" })).toBe(3);
  expectTypeOf(countFilled).parameters.toEqualTypeOf<[{ a?: string; b?: string; c?: string }]>();
  expectTypeOf(countFilled).returns.toEqualTypeOf<number>();
});
