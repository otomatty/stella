// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { canEdit, type Ticket } from "../src/q08-19-can-edit";
test("問19 canEdit", () => {
  expect(canEdit({ status: "open", title: "バグ" })).toBe(true);
  expect(canEdit({ status: "closed", title: "バグ", resolution: "修正" })).toBe(false);
  expectTypeOf(canEdit).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(canEdit).returns.toEqualTypeOf<boolean>();
});
