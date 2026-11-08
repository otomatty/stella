// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { updateScore, type Student } from "../src/q10-19-update-score";
test("問19 updateScore", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  const updated = updateScore(list, "山田", 90);
  expect(updated.map((s) => s.score)).toEqual([90, 95]);
  expect(list[0]?.score).toBe(80);
  expectTypeOf(updateScore).parameters.toEqualTypeOf<[readonly Student[], string, number]>();
  expectTypeOf(updateScore).returns.toEqualTypeOf<Student[]>();
});
