// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { timesTable } from "../src/q04-19-times-table";
test("問19 timesTable", () => {
  expect(timesTable(2, 3)).toEqual([2, 4, 6]);
  expect(timesTable(3)).toHaveLength(9);
  expectTypeOf(timesTable).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(timesTable).returns.toEqualTypeOf<number[]>();
});
