// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { tryOr } from "../src/q04-15-try-or";
// Error でないものを投げる関数
const throwText = (): number => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};
test("問15 tryOr", () => {
  expect(tryOr(() => 5, 0)).toBe(5);
  expect(tryOr(() => Number(JSON.parse("{")), 0)).toBe(0);
  expect(tryOr(throwText, -1)).toBe(-1);
  expectTypeOf(tryOr).parameters.toEqualTypeOf<[() => number, number]>();
  expectTypeOf(tryOr).returns.toEqualTypeOf<number>();
});
