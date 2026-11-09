// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { assignTicket, type Ticket } from "../src/q08-14-assign-ticket";
test("問14 assignTicket", () => {
  expect(assignTicket({ status: "open", title: "バグ" }, "山田")).toEqual({
    status: "assigned",
    title: "バグ",
    assignee: "山田",
  });
  expect(assignTicket({ status: "assigned", title: "バグ", assignee: "山田" }, "佐藤")).toEqual({
    status: "assigned",
    title: "バグ",
    assignee: "佐藤",
  });
  expect(assignTicket({ status: "closed", title: "バグ", resolution: "修正" }, "山田")).toEqual({
    status: "closed",
    title: "バグ",
    resolution: "修正",
  });
  expectTypeOf(assignTicket).parameters.toEqualTypeOf<[Ticket, string]>();
  expectTypeOf(assignTicket).returns.toEqualTypeOf<Ticket>();
});
