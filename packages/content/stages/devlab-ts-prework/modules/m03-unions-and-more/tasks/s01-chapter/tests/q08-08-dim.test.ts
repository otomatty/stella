// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dim, type Light } from "../src/q08-08-dim";
test("問8 dim", () => {
  expect(dim({ state: "on", brightness: 80 }, 30)).toEqual({ state: "on", brightness: 50 });
  expect(dim({ state: "on", brightness: 20 }, 30)).toEqual({ state: "off" });
  expect(dim({ state: "off" }, 30)).toEqual({ state: "off" });
  expectTypeOf(dim).parameters.toEqualTypeOf<[Light, number]>();
  expectTypeOf(dim).returns.toEqualTypeOf<Light>();
});
