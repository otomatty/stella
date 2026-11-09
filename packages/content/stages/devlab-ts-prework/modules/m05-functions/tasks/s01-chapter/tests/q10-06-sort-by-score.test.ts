// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortByScore, type Student } from "../src/q10-06-sort-by-score";
test("問6 sortByScore", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "高橋", grade: 2, score: 80 },
  ];
  expect(sortByScore(list).map((s) => s.name)).toEqual(["佐藤", "山田", "高橋"]);
  expect(list[0]?.name).toBe("山田");
  expectTypeOf(sortByScore).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(sortByScore).returns.toEqualTypeOf<Student[]>();
});
