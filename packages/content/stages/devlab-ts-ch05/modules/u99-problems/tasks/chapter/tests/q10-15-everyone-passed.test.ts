// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { everyonePassed, type Student } from "../src/q10-15-everyone-passed";
test("問15 everyonePassed", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(everyonePassed(list, 60)).toBe(true);
  expect(everyonePassed(list, 70)).toBe(false);
  expectTypeOf(everyonePassed).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(everyonePassed).returns.toEqualTypeOf<boolean>();
});
