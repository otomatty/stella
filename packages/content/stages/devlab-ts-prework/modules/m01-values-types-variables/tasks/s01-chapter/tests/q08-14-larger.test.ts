// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { larger } from "../src/q08-14-larger";
test("問14 larger", () => {
  expect(larger(3, 7)).toBe(7);
  expectTypeOf(larger).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(larger).returns.toEqualTypeOf<number>();
});
