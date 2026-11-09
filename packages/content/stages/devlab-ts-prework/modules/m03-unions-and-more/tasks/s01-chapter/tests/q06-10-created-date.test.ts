// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { createdDate, type Identified, type Timestamped } from "../src/q06-10-created-date";
test("問10 createdDate", () => {
  expect(createdDate({ id: 1, createdAt: new Date("2026-12-01T09:00:00Z") })).toBe("2026-12-01");
  expectTypeOf(createdDate).parameters.toEqualTypeOf<[Identified & Timestamped]>();
  expectTypeOf(createdDate).returns.toEqualTypeOf<string>();
});
