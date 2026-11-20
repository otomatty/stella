// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { idLabel, type Named, type Identified } from "../src/q06-08-id-label";
test("問8 idLabel", () => {
  expect(idLabel({ id: 3, name: "山田" })).toBe("#3 山田");
  expectTypeOf(idLabel).parameters.toEqualTypeOf<[Named & Identified]>();
  expectTypeOf(idLabel).returns.toEqualTypeOf<string>();
});
