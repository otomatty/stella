// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { allOk, type Result } from "../src/q05-18-all-ok";
test("問18 allOk", () => {
  expect(
    allOk([
      { ok: true, value: 1 },
      { ok: true, value: 2 },
    ]),
  ).toBe(true);
  expect(
    allOk([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
    ]),
  ).toBe(false);
  expect(allOk([])).toBe(true);
  expectTypeOf(allOk).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(allOk).returns.toEqualTypeOf<boolean>();
});
