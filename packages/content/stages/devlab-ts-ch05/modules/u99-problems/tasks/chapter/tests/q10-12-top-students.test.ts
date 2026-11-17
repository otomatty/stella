// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { topStudents, type Student } from "../src/q10-12-top-students";
test("問12 topStudents", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(topStudents(list, 2).map((s) => s.name)).toEqual(["佐藤", "山田"]);
  expectTypeOf(topStudents).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(topStudents).returns.toEqualTypeOf<Student[]>();
});
