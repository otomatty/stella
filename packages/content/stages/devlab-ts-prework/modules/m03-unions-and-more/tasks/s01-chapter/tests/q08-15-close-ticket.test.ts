// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { closeTicket, type Ticket } from "../src/q08-15-close-ticket";
test("問15 closeTicket", () => {
  expect(closeTicket({ status: "open", title: "バグ" }, "修正済み")).toEqual({
    status: "closed",
    title: "バグ",
    resolution: "修正済み",
  });
  expect(closeTicket({ status: "closed", title: "バグ", resolution: "重複" }, "修正済み")).toEqual({
    status: "closed",
    title: "バグ",
    resolution: "重複",
  });
  expectTypeOf(closeTicket).parameters.toEqualTypeOf<[Ticket, string]>();
  expectTypeOf(closeTicket).returns.toEqualTypeOf<Ticket>();
});
