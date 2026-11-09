// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { allStatuses, type Status } from "../src/q07-15-all-statuses";
test("問15 allStatuses", () => {
  expect(allStatuses()).toEqual(["todo", "doing", "done"]);
  expectTypeOf(allStatuses).returns.toEqualTypeOf<Status[]>();
});
