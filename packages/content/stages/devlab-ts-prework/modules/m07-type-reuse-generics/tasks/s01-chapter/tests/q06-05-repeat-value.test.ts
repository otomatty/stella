// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { repeatValue } from "../src/q06-05-repeat-value";
test("問5 repeatValue", () => {
  const words: string[] = ["x"];
  expect(repeatValue("x", 3)).toEqual(["x", "x", "x"]);
  expectTypeOf(repeatValue(words.join(""), 2)).toEqualTypeOf<string[]>();
});
