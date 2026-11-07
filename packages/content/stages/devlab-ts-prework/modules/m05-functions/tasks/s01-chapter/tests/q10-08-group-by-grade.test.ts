// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { groupByGrade, type Student } from "../src/q10-08-group-by-grade";
test("問8 groupByGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  const groups = groupByGrade(list);
  expect(groups["1"]?.map((s) => s.name)).toEqual(["山田", "鈴木"]);
  expect(groups["2"]?.map((s) => s.name)).toEqual(["佐藤"]);
  expectTypeOf(groupByGrade).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(groupByGrade).returns.toEqualTypeOf<{ [grade: string]: Student[] }>();
});
