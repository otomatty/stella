// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumOk, type Result } from "../src/q05-13-sum-ok";
test("問13 sumOk", () => {
  expect(
    sumOk([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: true, value: 2 },
    ]),
  ).toBe(3);
  expect(sumOk([])).toBe(0);
  expectTypeOf(sumOk).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(sumOk).returns.toEqualTypeOf<number>();
});
