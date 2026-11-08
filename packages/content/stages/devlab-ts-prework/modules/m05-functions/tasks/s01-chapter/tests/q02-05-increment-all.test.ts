// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { incrementAll } from "../src/q02-05-increment-all";
test("問5 incrementAll", () => {
  const counts = [1, 2];
  incrementAll(counts);
  expect(counts).toEqual([2, 3]);
  expectTypeOf(incrementAll).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(incrementAll).returns.toBeVoid();
});
