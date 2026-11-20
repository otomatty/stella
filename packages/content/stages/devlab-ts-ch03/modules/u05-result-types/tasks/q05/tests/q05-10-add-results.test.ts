// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addResults, type Result } from "../src/q05-10-add-results";
test("問10 addResults", () => {
  expect(addResults({ ok: true, value: 1 }, { ok: true, value: 2 })).toEqual({
    ok: true,
    value: 3,
  });
  expect(addResults({ ok: false, error: "a" }, { ok: false, error: "b" })).toEqual({
    ok: false,
    error: "a",
  });
  expect(addResults({ ok: true, value: 1 }, { ok: false, error: "b" })).toEqual({
    ok: false,
    error: "b",
  });
  expectTypeOf(addResults).parameters.toEqualTypeOf<[Result, Result]>();
  expectTypeOf(addResults).returns.toEqualTypeOf<Result>();
});
