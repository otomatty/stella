// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { commandName } from "../src/q08-17-command-name";
test("問17 commandName", () => {
  expect(commandName("  ADD 1 2")).toBe("add");
  expect(commandName("help")).toBe("help");
  expect(() => commandName("   ")).toThrow("コマンドがありません");
  expectTypeOf(commandName).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(commandName).returns.toEqualTypeOf<string>();
});
