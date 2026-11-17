// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { findByName, type Student } from "../src/q10-18-find-by-name";
test("問18 findByName", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  expect(findByName(list, "佐藤")?.score).toBe(95);
  expect(findByName(list, "鈴木")).toBeUndefined();
  expectTypeOf(findByName).parameters.toEqualTypeOf<[readonly Student[], string]>();
  expectTypeOf(findByName).returns.toEqualTypeOf<Student | undefined>();
});
