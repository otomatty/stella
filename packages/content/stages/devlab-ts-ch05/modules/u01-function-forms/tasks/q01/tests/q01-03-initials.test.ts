// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { initials } from "../src/q01-03-initials";
test("問3 initials", () => {
  expect(initials("Taro", "Yamada")).toBe("T.Y.");
  expectTypeOf(initials).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(initials).returns.toEqualTypeOf<string>();
});
