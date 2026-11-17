// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sameIgnoringCase } from "../src/q05-20-same-ignoring-case";
test("問20 sameIgnoringCase", () => {
  expect(sameIgnoringCase("Agora", "AGORA")).toBe(true);
  expect(sameIgnoringCase("Agora", "Agola")).toBe(false);
  expectTypeOf(sameIgnoringCase).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(sameIgnoringCase).returns.toEqualTypeOf<boolean>();
});
