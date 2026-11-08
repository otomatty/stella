// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toMillimeters, type Unit } from "../src/q02-14-to-millimeters";
test("問14 toMillimeters", () => {
  expectTypeOf<Unit>().toEqualTypeOf<"mm" | "cm" | "m">();
  expect(toMillimeters(1.5, "m")).toBe(1500);
  expect(toMillimeters(3, "cm")).toBe(30);
  expect(toMillimeters(7, "mm")).toBe(7);
  expectTypeOf(toMillimeters).parameters.toEqualTypeOf<[number, Unit]>();
  expectTypeOf(toMillimeters).returns.toEqualTypeOf<number>();
});
