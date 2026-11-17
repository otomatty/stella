// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countOk, type Result } from "../src/q05-11-count-ok";
test("問11 countOk", () => {
  expect(
    countOk([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: true, value: 2 },
    ]),
  ).toBe(2);
  expect(countOk([])).toBe(0);
  expectTypeOf(countOk).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(countOk).returns.toEqualTypeOf<number>();
});
