// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { filled } from "../src/q05-19-filled";
test("問19 filled", () => {
  expect(filled(3, 0)).toEqual([0, 0, 0]);
  expect(filled(0, 7)).toEqual([]);
  expectTypeOf(filled).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(filled).returns.toEqualTypeOf<number[]>();
});
