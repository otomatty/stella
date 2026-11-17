// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isColor } from "../src/q01-17-is-color";
test("問17 isColor", () => {
  expect(isColor("red")).toBe(true);
  expect(isColor("pink")).toBe(false);
  expectTypeOf(isColor).guards.toEqualTypeOf<"red" | "green" | "blue">();
});
