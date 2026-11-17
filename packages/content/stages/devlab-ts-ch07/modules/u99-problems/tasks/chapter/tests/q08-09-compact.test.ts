// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { compact } from "../src/q08-09-compact";
test("問9 compact", () => {
  const values: (number | null | undefined)[] = [1, null, 2, undefined, 0];
  expect(compact(values)).toEqual([1, 2, 0]);
  expectTypeOf(compact(values)).toEqualTypeOf<number[]>();
});
