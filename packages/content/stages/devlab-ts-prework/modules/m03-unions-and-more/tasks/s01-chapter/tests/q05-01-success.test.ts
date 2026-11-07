// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { success, type Result } from "../src/q05-01-success";
test("問1 success", () => {
  expect(success(3)).toEqual({ ok: true, value: 3 });
  expectTypeOf(success).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(success).returns.toEqualTypeOf<Result>();
});
