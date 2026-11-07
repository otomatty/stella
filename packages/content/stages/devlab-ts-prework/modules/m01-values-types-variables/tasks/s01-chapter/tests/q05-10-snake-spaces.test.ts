// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { snakeSpaces } from "../src/q05-10-snake-spaces";
test("問10 snakeSpaces", () => {
  expect(snakeSpaces("a b c")).toBe("a_b_c");
  expect(snakeSpaces("abc")).toBe("abc");
  expectTypeOf(snakeSpaces).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(snakeSpaces).returns.toEqualTypeOf<string>();
});
