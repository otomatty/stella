// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { place, type Place, type Named } from "../src/q06-20-place";
test("問20 place", () => {
  expectTypeOf<Place>().toEqualTypeOf<Named & { lat: number; lng: number }>();
  expect(place("東京駅", 35.68, 139.76)).toEqual({ name: "東京駅", lat: 35.68, lng: 139.76 });
  expectTypeOf(place).parameters.toEqualTypeOf<[string, number, number]>();
  expectTypeOf(place).returns.toEqualTypeOf<Place>();
});
