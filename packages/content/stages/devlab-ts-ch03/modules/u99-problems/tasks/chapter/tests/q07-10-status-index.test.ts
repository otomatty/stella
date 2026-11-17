// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { statusIndex, type Status } from "../src/q07-10-status-index";
test("問10 statusIndex", () => {
  expect(statusIndex("todo")).toBe(0);
  expect(statusIndex("done")).toBe(2);
  expectTypeOf(statusIndex).parameters.toEqualTypeOf<[Status]>();
  expectTypeOf(statusIndex).returns.toEqualTypeOf<number>();
});
