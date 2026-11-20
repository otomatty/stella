// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { failure, type Result } from "../src/q05-02-failure";
test("問2 failure", () => {
  expect(failure("だめ")).toEqual({ ok: false, error: "だめ" });
  expectTypeOf(failure).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(failure).returns.toEqualTypeOf<Result>();
});
