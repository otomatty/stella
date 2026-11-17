// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { accountText, type Account } from "../src/q04-17-account-text";
test("問17 accountText", () => {
  expectTypeOf<Account>().toEqualTypeOf<{ plan: "free" } | { plan: "paid"; until: string }>();
  expect(accountText({ plan: "free" })).toBe("無料");
  expect(accountText({ plan: "paid", until: "2026-12-31" })).toBe("有料（2026-12-31まで）");
  expectTypeOf(accountText).parameters.toEqualTypeOf<[Account]>();
  expectTypeOf(accountText).returns.toEqualTypeOf<string>();
});
