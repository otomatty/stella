// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { atPosition } from "../src/q05-11-at-position";
test("問11 atPosition", () => {
  expect(atPosition("taro@example.com")).toBe(4);
  expect(atPosition("example.com")).toBe(-1);
  expectTypeOf(atPosition).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(atPosition).returns.toEqualTypeOf<number>();
});
