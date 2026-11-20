// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { inGrade, type Student } from "../src/q10-04-in-grade";
test("問4 inGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(inGrade(list, 1).map((s) => s.name)).toEqual(["山田", "鈴木"]);
  expectTypeOf(inGrade).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(inGrade).returns.toEqualTypeOf<Student[]>();
});
