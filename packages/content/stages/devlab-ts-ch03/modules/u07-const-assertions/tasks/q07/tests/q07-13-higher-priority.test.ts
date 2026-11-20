// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { higherPriority, type Priority } from "../src/q07-13-higher-priority";
test("問13 higherPriority", () => {
  expect(higherPriority("low", "middle")).toBe("middle");
  expect(higherPriority("high", "middle")).toBe("high");
  expect(higherPriority("low", "low")).toBe("low");
  expectTypeOf(higherPriority).parameters.toEqualTypeOf<[Priority, Priority]>();
  expectTypeOf(higherPriority).returns.toEqualTypeOf<Priority>();
});
