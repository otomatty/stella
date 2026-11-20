// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { assigneeOf, type Ticket } from "../src/q08-17-assignee-of";
test("問17 assigneeOf", () => {
  expect(assigneeOf({ status: "assigned", title: "バグ", assignee: "山田" })).toBe("山田");
  expect(assigneeOf({ status: "open", title: "バグ" })).toBeUndefined();
  expectTypeOf(assigneeOf).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(assigneeOf).returns.toEqualTypeOf<string | undefined>();
});
