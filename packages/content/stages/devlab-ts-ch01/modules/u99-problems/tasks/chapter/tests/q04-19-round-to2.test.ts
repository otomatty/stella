// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { roundTo2 } from "../src/q04-19-round-to2";
test("問19 roundTo2", () => {
  expect(roundTo2(1.234)).toBe(1.23);
  expect(roundTo2(9.876)).toBe(9.88);
  expect(roundTo2(3)).toBe(3);
  expectTypeOf(roundTo2).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(roundTo2).returns.toEqualTypeOf<number>();
});
