// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSerious, type Notice } from "../src/q04-10-is-serious";
test("問10 isSerious", () => {
  expect(isSerious({ type: "info", message: "x" })).toBe(false);
  expect(isSerious({ type: "warning", message: "x", level: 2 })).toBe(false);
  expect(isSerious({ type: "warning", message: "x", level: 3 })).toBe(true);
  expect(isSerious({ type: "error", message: "x", code: 500 })).toBe(true);
  expectTypeOf(isSerious).parameters.toEqualTypeOf<[Notice]>();
  expectTypeOf(isSerious).returns.toEqualTypeOf<boolean>();
});
