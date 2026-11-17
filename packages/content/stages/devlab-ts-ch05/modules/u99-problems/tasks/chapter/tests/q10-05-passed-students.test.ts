// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { passedStudents, type Student } from "../src/q10-05-passed-students";
test("問5 passedStudents", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(passedStudents(list, 70).map((s) => s.name)).toEqual(["山田"]);
  expectTypeOf(passedStudents).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(passedStudents).returns.toEqualTypeOf<Student[]>();
});
