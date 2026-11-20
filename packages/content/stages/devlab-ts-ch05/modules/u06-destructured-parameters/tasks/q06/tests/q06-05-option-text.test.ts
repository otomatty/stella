// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { optionText } from "../src/q06-05-option-text";
test("問5 optionText", () => {
  expect(optionText({ color: "red" })).toBe("M/red");
  expect(optionText({})).toBe("M/black");
  expectTypeOf(optionText).parameters.toEqualTypeOf<[{ size?: string; color?: string }]>();
  expectTypeOf(optionText).returns.toEqualTypeOf<string>();
});
