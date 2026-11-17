// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { tokenText, type Token } from "../src/q04-18-token-text";
test("問18 tokenText", () => {
  expectTypeOf<Token>().toEqualTypeOf<
    { type: "number"; value: number } | { type: "plus" } | { type: "minus" }
  >();
  expect(tokenText({ type: "number", value: 3 })).toBe("3");
  expect(tokenText({ type: "plus" })).toBe("+");
  expect(tokenText({ type: "minus" })).toBe("-");
  expectTypeOf(tokenText).parameters.toEqualTypeOf<[Token]>();
  expectTypeOf(tokenText).returns.toEqualTypeOf<string>();
});
