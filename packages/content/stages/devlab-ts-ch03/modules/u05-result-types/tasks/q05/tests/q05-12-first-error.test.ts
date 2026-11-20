// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstError, type Result } from "../src/q05-12-first-error";
test("問12 firstError", () => {
  expect(
    firstError([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: false, error: "y" },
    ]),
  ).toBe("x");
  expect(firstError([{ ok: true, value: 1 }])).toBeUndefined();
  expectTypeOf(firstError).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(firstError).returns.toEqualTypeOf<string | undefined>();
});
