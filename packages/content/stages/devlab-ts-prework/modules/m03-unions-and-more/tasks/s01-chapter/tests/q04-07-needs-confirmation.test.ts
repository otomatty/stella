// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { needsConfirmation, type Payment } from "../src/q04-07-needs-confirmation";
test("問7 needsConfirmation", () => {
  expect(needsConfirmation({ method: "cash" })).toBe(false);
  expect(needsConfirmation({ method: "bank", bankName: "みらい銀行" })).toBe(true);
  expectTypeOf(needsConfirmation).parameters.toEqualTypeOf<[Payment]>();
  expectTypeOf(needsConfirmation).returns.toEqualTypeOf<boolean>();
});
