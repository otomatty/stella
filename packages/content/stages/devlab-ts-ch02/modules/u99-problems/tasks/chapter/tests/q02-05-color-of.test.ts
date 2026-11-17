// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { colorOf } from "../src/q02-05-color-of";
test("問5 colorOf", () => {
  expect(colorOf({ color: "red" })).toBe("red");
  expect(colorOf({})).toBe("black");
  expectTypeOf(colorOf).parameters.toEqualTypeOf<[{ color?: string }]>();
  expectTypeOf(colorOf).returns.toEqualTypeOf<string>();
});
