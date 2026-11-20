// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueSorted } from "../src/q02-04-unique-sorted";
test("問4 uniqueSorted", () => {
  const items = [3, 1, 10, 3, 2];
  expect(uniqueSorted(items)).toEqual([1, 2, 3, 10]);
  expect(items).toEqual([3, 1, 10, 3, 2]);
  expectTypeOf(uniqueSorted).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(uniqueSorted).returns.toEqualTypeOf<number[]>();
});
