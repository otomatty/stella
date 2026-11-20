// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { filledWith } from "../src/q06-17-filled-with";
test("問17 filledWith", () => {
  const words: string[] = ["x"];
  expect(filledWith(3, 0)).toEqual([0, 0, 0]);
  expectTypeOf(filledWith(2, words)).toEqualTypeOf<string[][]>();
});
