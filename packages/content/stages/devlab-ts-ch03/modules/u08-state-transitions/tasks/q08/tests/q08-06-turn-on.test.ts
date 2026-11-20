// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { turnOn, type Light } from "../src/q08-06-turn-on";
test("問6 turnOn", () => {
  expect(turnOn({ state: "off" })).toEqual({ state: "on", brightness: 100 });
  expect(turnOn({ state: "on", brightness: 40 })).toEqual({ state: "on", brightness: 40 });
  expectTypeOf(turnOn).parameters.toEqualTypeOf<[Light]>();
  expectTypeOf(turnOn).returns.toEqualTypeOf<Light>();
});
