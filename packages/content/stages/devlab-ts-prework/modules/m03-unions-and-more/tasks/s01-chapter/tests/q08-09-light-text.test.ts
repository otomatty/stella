// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lightText, type Light } from "../src/q08-09-light-text";
test("問9 lightText", () => {
  expect(lightText({ state: "off" })).toBe("消灯");
  expect(lightText({ state: "on", brightness: 80 })).toBe("点灯（80%）");
  expectTypeOf(lightText).parameters.toEqualTypeOf<[Light]>();
  expectTypeOf(lightText).returns.toEqualTypeOf<string>();
});
