// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { DAYS } from "../src/q07-01-days";
test("問1 DAYS", () => {
  expect(DAYS).toEqual(["月", "火", "水"]);
  expectTypeOf<typeof DAYS>().toEqualTypeOf<readonly ["月", "火", "水"]>();
});
