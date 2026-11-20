// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { reopen, type Ticket } from "../src/q08-16-reopen";
test("問16 reopen", () => {
  expect(reopen({ status: "closed", title: "バグ", resolution: "修正" })).toEqual({
    status: "open",
    title: "バグ",
  });
  expect(reopen({ status: "open", title: "バグ" })).toEqual({ status: "open", title: "バグ" });
  expectTypeOf(reopen).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(reopen).returns.toEqualTypeOf<Ticket>();
});
