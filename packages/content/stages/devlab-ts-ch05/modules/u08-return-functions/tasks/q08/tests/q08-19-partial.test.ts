// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { partial } from "../src/q08-19-partial";
test("問19 partial", () => {
  expect(partial((a, b) => a - b, 10)(3)).toBe(7);
  expectTypeOf(partial).parameters.toEqualTypeOf<[(a: number, b: number) => number, number]>();
  expectTypeOf(partial).returns.toEqualTypeOf<(b: number) => number>();
});
