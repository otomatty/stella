// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { collectErrors } from "../src/q04-17-collect-errors";
// Error でないものを投げる関数
const throwText = (): number => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};
test("問17 collectErrors", () => {
  const fns = [
    () => undefined,
    () => {
      throw new Error("a");
    },
    () => {
      throwText();
    },
    () => {
      throw new TypeError("b");
    },
  ];
  expect(collectErrors(fns)).toEqual(["a", "不明なエラー", "b"]);
  expectTypeOf(collectErrors).parameters.toEqualTypeOf<[(() => void)[]]>();
  expectTypeOf(collectErrors).returns.toEqualTypeOf<string[]>();
});
