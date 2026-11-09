// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { moveX } from "../src/q07-13-move-x";
test("問13 moveX", () => {
  expect(moveX(5, "left")).toBe(4);
  expect(moveX(5, "right")).toBe(6);
  expectTypeOf(moveX).parameters.toEqualTypeOf<[number, "left" | "right"]>();
  expectTypeOf(moveX).returns.toEqualTypeOf<number>();
});
