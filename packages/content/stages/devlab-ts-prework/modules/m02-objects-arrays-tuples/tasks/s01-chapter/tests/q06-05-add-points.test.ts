// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addPoints } from "../src/q06-05-add-points";
test("問5 addPoints", () => {
  expect(addPoints([1, 2], [3, 4])).toEqual([4, 6]);
  expectTypeOf(addPoints).parameters.toEqualTypeOf<[[number, number], [number, number]]>();
  expectTypeOf(addPoints).returns.toEqualTypeOf<[number, number]>();
});
