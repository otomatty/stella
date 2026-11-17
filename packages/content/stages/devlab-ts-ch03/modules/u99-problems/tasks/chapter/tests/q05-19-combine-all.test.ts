// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { combineAll, type Result } from "../src/q05-19-combine-all";
test("問19 combineAll", () => {
  expect(
    combineAll([
      { ok: true, value: 1 },
      { ok: true, value: 2 },
    ]),
  ).toEqual({ ok: true, value: 3 });
  expect(
    combineAll([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: false, error: "y" },
    ]),
  ).toEqual({
    ok: false,
    error: "x",
  });
  expect(combineAll([])).toEqual({ ok: true, value: 0 });
  expectTypeOf(combineAll).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(combineAll).returns.toEqualTypeOf<Result>();
});
