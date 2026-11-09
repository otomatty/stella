// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ticketText, type Ticket } from "../src/q08-18-ticket-text";
test("問18 ticketText", () => {
  expect(ticketText({ status: "open", title: "バグ" })).toBe("[未対応] バグ");
  expect(ticketText({ status: "assigned", title: "バグ", assignee: "山田" })).toBe(
    "[担当: 山田] バグ",
  );
  expect(ticketText({ status: "closed", title: "バグ", resolution: "修正済み" })).toBe(
    "[完了: 修正済み] バグ",
  );
  expectTypeOf(ticketText).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(ticketText).returns.toEqualTypeOf<string>();
});
