// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { atLeast, type Result } from "../src/q05-17-at-least";
test("問17 atLeast", () => {
  expect(atLeast({ ok: true, value: 3 }, 5)).toEqual({ ok: false, error: "5未満です" });
  expect(atLeast({ ok: true, value: 7 }, 5)).toEqual({ ok: true, value: 7 });
  expect(atLeast({ ok: false, error: "x" }, 5)).toEqual({ ok: false, error: "x" });
  expectTypeOf(atLeast).parameters.toEqualTypeOf<[Result, number]>();
  expectTypeOf(atLeast).returns.toEqualTypeOf<Result>();
});
