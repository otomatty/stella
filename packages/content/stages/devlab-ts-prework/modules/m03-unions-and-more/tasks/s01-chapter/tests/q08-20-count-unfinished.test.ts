// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countUnfinished, type Ticket } from "../src/q08-20-count-unfinished";
test("問20 countUnfinished", () => {
  expect(
    countUnfinished([
      { status: "open", title: "a" },
      { status: "assigned", title: "b", assignee: "山田" },
      { status: "closed", title: "c", resolution: "修正" },
    ]),
  ).toBe(2);
  expect(countUnfinished([])).toBe(0);
  expectTypeOf(countUnfinished).parameters.toEqualTypeOf<[readonly Ticket[]]>();
  expectTypeOf(countUnfinished).returns.toEqualTypeOf<number>();
});
