// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { opSymbol, type Op } from "../src/q07-06-op-symbol";
test("問6 opSymbol", () => {
  expect(opSymbol("add")).toBe("+");
  expect(opSymbol("sub")).toBe("-");
  expect(opSymbol("mul")).toBe("×");
  expectTypeOf(opSymbol).parameters.toEqualTypeOf<[Op]>();
  expectTypeOf(opSymbol).returns.toEqualTypeOf<"+" | "-" | "×">();
});
