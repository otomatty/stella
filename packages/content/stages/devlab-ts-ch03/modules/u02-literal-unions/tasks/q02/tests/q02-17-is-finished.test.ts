// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isFinished, type TaskStatus } from "../src/q02-17-is-finished";
test("問17 isFinished", () => {
  expectTypeOf<TaskStatus>().toEqualTypeOf<"todo" | "doing" | "done">();
  expect(isFinished("done")).toBe(true);
  expect(isFinished("doing")).toBe(false);
  expectTypeOf(isFinished).parameters.toEqualTypeOf<[TaskStatus]>();
  expectTypeOf(isFinished).returns.toEqualTypeOf<boolean>();
});
