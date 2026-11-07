// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parkingFee } from "../src/q01-15-parking-fee";
test("問15 parkingFee", () => {
  expect(parkingFee(30)).toBe(0);
  expect(parkingFee(31)).toBe(400);
  expect(parkingFee(60)).toBe(400);
  expect(parkingFee(61)).toBe(600);
  expectTypeOf(parkingFee).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(parkingFee).returns.toEqualTypeOf<number>();
});
