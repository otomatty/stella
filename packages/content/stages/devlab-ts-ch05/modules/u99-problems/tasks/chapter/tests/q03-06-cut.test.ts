// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cut } from "../src/q03-06-cut";
test("問6 cut", () => {
  expect(cut("TypeScript入門講座", 6)).toBe("TypeSc…");
  expect(cut("TypeScript入門講座")).toBe("TypeScript…");
  expect(cut("短い")).toBe("短い");
  expectTypeOf(cut).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(cut).returns.toEqualTypeOf<string>();
});
