// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { moveToFront } from "../src/q05-15-move-to-front";
test("問15 moveToFront", () => {
  const items = ["a", "b", "c"];
  expect(moveToFront(items, 2)).toEqual(["c", "a", "b"]);
  expect(moveToFront(items, 0)).toEqual(["a", "b", "c"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(moveToFront).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(moveToFront).returns.toEqualTypeOf<string[]>();
});
