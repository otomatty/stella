// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { prevStatus, type Status } from "../src/q07-11-prev-status";
test("問11 prevStatus", () => {
  expect(prevStatus("done")).toBe("doing");
  expect(prevStatus("doing")).toBe("todo");
  expect(prevStatus("todo")).toBe("todo");
  expectTypeOf(prevStatus).parameters.toEqualTypeOf<[Status]>();
  expectTypeOf(prevStatus).returns.toEqualTypeOf<Status>();
});
