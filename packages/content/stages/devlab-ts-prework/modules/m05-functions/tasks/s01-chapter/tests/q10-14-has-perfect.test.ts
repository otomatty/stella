// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasPerfect, type Student } from "../src/q10-14-has-perfect";
test("問14 hasPerfect", () => {
  expect(hasPerfect([{ name: "山田", grade: 1, score: 100 }])).toBe(true);
  expect(hasPerfect([{ name: "山田", grade: 1, score: 99 }])).toBe(false);
  expectTypeOf(hasPerfect).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(hasPerfect).returns.toEqualTypeOf<boolean>();
});
