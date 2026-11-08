// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { wrapError } from "../src/q04-13-wrap-error";
test("問13 wrapError", () => {
  const original = new TypeError("型");
  const wrapped = wrapError(original, "保存できません");
  expect(wrapped.message).toBe("保存できません");
  expect(wrapped.cause).toBe(original);
  expectTypeOf(wrapError).parameters.toEqualTypeOf<[unknown, string]>();
  expectTypeOf(wrapError).returns.toEqualTypeOf<Error>();
});
