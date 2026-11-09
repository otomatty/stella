// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ENTRY } from "../src/q07-08-entry";
test("問8 ENTRY", () => {
  expect(ENTRY).toEqual(["key", 1]);
  expectTypeOf<typeof ENTRY>().toEqualTypeOf<readonly ["key", 1]>();
});
