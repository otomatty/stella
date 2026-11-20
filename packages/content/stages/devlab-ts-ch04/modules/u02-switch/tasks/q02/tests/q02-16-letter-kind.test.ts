// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { letterKind } from "../src/q02-16-letter-kind";
test("問16 letterKind", () => {
  expect(letterKind("a")).toBe("母音");
  expect(letterKind("u")).toBe("母音");
  expect(letterKind("b")).toBe("子音");
  expectTypeOf(letterKind).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(letterKind).returns.toEqualTypeOf<"母音" | "子音">();
});
