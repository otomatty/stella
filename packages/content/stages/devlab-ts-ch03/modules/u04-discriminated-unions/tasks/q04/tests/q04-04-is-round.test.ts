// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isRound, type Shape } from "../src/q04-04-is-round";
test("問4 isRound", () => {
  expect(isRound({ kind: "circle", radius: 1 })).toBe(true);
  expect(isRound({ kind: "square", size: 1 })).toBe(false);
  expectTypeOf(isRound).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(isRound).returns.toEqualTypeOf<boolean>();
});
