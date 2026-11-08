// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameText } from "../src/q03-03-name-text";
test("問3 nameText", () => {
  expect(nameText("山田", "太郎")).toBe("山田 太郎");
  expect(nameText("山田")).toBe("山田");
  expectTypeOf(nameText).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(nameText).returns.toEqualTypeOf<string>();
});
