// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orElse, type Result } from "../src/q05-20-or-else";
test("問20 orElse", () => {
  expect(orElse({ ok: true, value: 1 }, { ok: true, value: 2 })).toEqual({ ok: true, value: 1 });
  expect(orElse({ ok: false, error: "x" }, { ok: true, value: 2 })).toEqual({ ok: true, value: 2 });
  expectTypeOf(orElse).parameters.toEqualTypeOf<[Result, Result]>();
  expectTypeOf(orElse).returns.toEqualTypeOf<Result>();
});
