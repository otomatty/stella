// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isOk, type Result } from "../src/q05-03-is-ok";
test("問3 isOk", () => {
  expect(isOk({ ok: true, value: 1 })).toBe(true);
  expect(isOk({ ok: false, error: "x" })).toBe(false);
  expectTypeOf(isOk).parameters.toEqualTypeOf<[Result]>();
  expectTypeOf(isOk).returns.toEqualTypeOf<boolean>();
});
