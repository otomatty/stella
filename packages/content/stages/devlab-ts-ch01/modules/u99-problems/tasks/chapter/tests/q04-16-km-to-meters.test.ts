// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { kmToMeters } from "../src/q04-16-km-to-meters";
test("問16 kmToMeters", () => {
  expect(kmToMeters(1.5)).toBe(1500);
  expect(kmToMeters(42.195)).toBe(42195);
  expectTypeOf(kmToMeters).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(kmToMeters).returns.toEqualTypeOf<number>();
});
