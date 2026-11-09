// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { turnOff, type Light } from "../src/q08-07-turn-off";
test("問7 turnOff", () => {
  expect(turnOff({ state: "on", brightness: 40 })).toEqual({ state: "off" });
  expect(turnOff({ state: "off" })).toEqual({ state: "off" });
  expectTypeOf(turnOff).parameters.toEqualTypeOf<[Light]>();
  expectTypeOf(turnOff).returns.toEqualTypeOf<Light>();
});
