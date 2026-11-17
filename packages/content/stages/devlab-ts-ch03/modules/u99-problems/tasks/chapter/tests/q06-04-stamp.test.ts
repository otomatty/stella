// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { stamp, type Named, type Timestamped } from "../src/q06-04-stamp";
test("問4 stamp", () => {
  const at = new Date("2026-12-01T09:00:00Z");
  expect(stamp({ name: "メモ" }, at)).toEqual({ name: "メモ", createdAt: at });
  expectTypeOf(stamp).parameters.toEqualTypeOf<[Named, Date]>();
  expectTypeOf(stamp).returns.toEqualTypeOf<Named & Timestamped>();
});
