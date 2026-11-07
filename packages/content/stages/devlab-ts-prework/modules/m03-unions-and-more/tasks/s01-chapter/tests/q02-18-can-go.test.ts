// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { canGo, type Signal } from "../src/q02-18-can-go";
test("問18 canGo", () => {
  expectTypeOf<Signal>().toEqualTypeOf<"red" | "yellow" | "green">();
  expect(canGo("green")).toBe(true);
  expect(canGo("yellow")).toBe(false);
  expectTypeOf(canGo).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(canGo).returns.toEqualTypeOf<boolean>();
});
