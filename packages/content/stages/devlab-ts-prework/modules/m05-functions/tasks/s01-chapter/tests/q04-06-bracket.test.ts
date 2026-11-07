// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bracket } from "../src/q04-06-bracket";
test("問6 bracket", () => {
  expect(bracket("a")).toBe("[a]");
  expect(bracket("a", "(", ")")).toBe("(a)");
  expectTypeOf(bracket).parameters.toEqualTypeOf<[string, string?, string?]>();
  expectTypeOf(bracket).returns.toEqualTypeOf<string>();
});
