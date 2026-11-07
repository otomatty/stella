// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { average2 } from "../src/q04-14-average2";
test("問14 average2", () => {
  expect(average2(3, 8)).toBe(5.5);
  expect(average2(-2, 2)).toBe(0);
  expectTypeOf(average2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(average2).returns.toEqualTypeOf<number>();
});
