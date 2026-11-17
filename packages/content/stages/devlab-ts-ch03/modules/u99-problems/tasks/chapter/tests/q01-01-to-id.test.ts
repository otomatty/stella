// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toId } from "../src/q01-01-to-id";
test("問1 toId", () => {
  expect(toId(42)).toBe("42");
  expect(toId("a-1")).toBe("a-1");
  expectTypeOf(toId).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(toId).returns.toEqualTypeOf<string>();
});
