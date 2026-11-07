// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { passFail } from "../src/q01-03-pass-fail";
test("問3 passFail", () => {
  expect(passFail(60)).toBe("合格");
  expect(passFail(59)).toBe("不合格");
  expectTypeOf(passFail).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(passFail).returns.toEqualTypeOf<"合格" | "不合格">();
});
