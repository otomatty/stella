// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstThree } from "../src/q05-03-first-three";
test("問3 firstThree", () => {
  expect(firstThree("TypeScript")).toBe("Typ");
  expect(firstThree("ab")).toBe("ab");
  expectTypeOf(firstThree).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstThree).returns.toEqualTypeOf<string>();
});
