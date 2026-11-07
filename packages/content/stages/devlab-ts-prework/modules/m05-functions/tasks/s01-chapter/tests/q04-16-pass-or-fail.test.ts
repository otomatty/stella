// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { passOrFail } from "../src/q04-16-pass-or-fail";
test("問16 passOrFail", () => {
  expect(passOrFail(70)).toBe("合格");
  expect(passOrFail(70, 80)).toBe("不合格");
  expectTypeOf(passOrFail).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(passOrFail).returns.toEqualTypeOf<"合格" | "不合格">();
});
