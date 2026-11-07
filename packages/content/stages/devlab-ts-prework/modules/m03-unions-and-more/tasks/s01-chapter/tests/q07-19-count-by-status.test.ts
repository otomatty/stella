// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countByStatus, type Status } from "../src/q07-19-count-by-status";
test("問19 countByStatus", () => {
  expect(countByStatus(["todo", "done", "done"])).toEqual({ todo: 1, doing: 0, done: 2 });
  expect(countByStatus([])).toEqual({ todo: 0, doing: 0, done: 0 });
  expectTypeOf(countByStatus).parameters.toEqualTypeOf<[readonly Status[]]>();
  expectTypeOf(countByStatus).returns.toEqualTypeOf<{
    todo: number;
    doing: number;
    done: number;
  }>();
});
