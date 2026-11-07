// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { metersPer } from "../src/q02-10-meters-per";
test("問10 metersPer", () => {
  expect(metersPer("mm")).toBe(0.001);
  expect(metersPer("cm")).toBe(0.01);
  expect(metersPer("m")).toBe(1);
  expect(metersPer("km")).toBe(1000);
  expectTypeOf(metersPer).parameters.toEqualTypeOf<["mm" | "cm" | "m" | "km"]>();
  expectTypeOf(metersPer).returns.toEqualTypeOf<number>();
});
