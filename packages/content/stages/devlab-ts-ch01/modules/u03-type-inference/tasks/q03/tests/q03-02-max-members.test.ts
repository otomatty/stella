// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { MAX_MEMBERS } from "../src/q03-02-max-members";
test("問2 MAX_MEMBERS", () => {
  expect(MAX_MEMBERS).toBe(50);
  expectTypeOf<typeof MAX_MEMBERS>().toEqualTypeOf<50>();
});
