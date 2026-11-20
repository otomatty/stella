// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scoreOf } from "../src/q08-01-score-of";
test("問1 scoreOf", () => {
  expect(scoreOf({ 山田: 80, 佐藤: 70 }, "山田")).toBe(80);
  expect(scoreOf({ 山田: 80 }, "鈴木")).toBe(0);
  expectTypeOf(scoreOf).parameters.toEqualTypeOf<[{ [name: string]: number }, string]>();
  expectTypeOf(scoreOf).returns.toEqualTypeOf<number>();
});
