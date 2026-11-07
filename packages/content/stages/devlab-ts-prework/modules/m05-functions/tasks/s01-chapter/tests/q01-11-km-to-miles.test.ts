// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { kmToMiles } from "../src/q01-11-km-to-miles";
test("問11 kmToMiles", () => {
  expect(kmToMiles(10)).toBe(6.22);
  expect(kmToMiles(0)).toBe(0);
  expectTypeOf(kmToMiles).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(kmToMiles).returns.toEqualTypeOf<number>();
});
