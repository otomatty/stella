// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { attempt } from "../src/q04-16-attempt";
// Error でないものを投げる関数
const throwText = (): number => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};
test("問16 attempt", () => {
  expect(attempt(() => 5)).toEqual({ ok: true, value: 5 });
  const original = new RangeError("範囲外");
  const failed = attempt(() => {
    throw original;
  });
  expect(failed).toEqual({ ok: false, error: original });
  const text = attempt(throwText);
  expect(text.ok ? "" : text.error.message).toBe("文字列");
  expectTypeOf(attempt).parameters.toEqualTypeOf<[() => number]>();
  expectTypeOf(attempt).returns.toEqualTypeOf<
    { ok: true; value: number } | { ok: false; error: Error }
  >();
});
