// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addAll } from "../src/q02-02-add-all";
test("問2 addAll", () => {
  const target = [0];
  addAll(target, [1, 2]);
  expect(target).toEqual([0, 1, 2]);
  expectTypeOf(addAll).parameters.toEqualTypeOf<[number[], readonly number[]]>();
  expectTypeOf(addAll).returns.toBeVoid();
});
