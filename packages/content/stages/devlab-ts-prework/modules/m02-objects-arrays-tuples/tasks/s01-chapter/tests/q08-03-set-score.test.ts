// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { setScore } from "../src/q08-03-set-score";
test("問3 setScore", () => {
  const scores = { 山田: 80 };
  expect(setScore(scores, "佐藤", 70)).toEqual({ 山田: 80, 佐藤: 70 });
  expect(setScore(scores, "山田", 90)).toEqual({ 山田: 90 });
  expect(scores).toEqual({ 山田: 80 });
  expectTypeOf(setScore).parameters.toEqualTypeOf<[{ [name: string]: number }, string, number]>();
  expectTypeOf(setScore).returns.toEqualTypeOf<{ [name: string]: number }>();
});
