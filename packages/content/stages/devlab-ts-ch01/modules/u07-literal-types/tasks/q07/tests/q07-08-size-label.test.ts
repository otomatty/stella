// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sizeLabel } from "../src/q07-08-size-label";
test("問8 sizeLabel", () => {
  expect(sizeLabel("S")).toBe("小");
  expect(sizeLabel("M")).toBe("中");
  expect(sizeLabel("L")).toBe("大");
  expectTypeOf(sizeLabel).parameters.toEqualTypeOf<["S" | "M" | "L"]>();
  expectTypeOf(sizeLabel).returns.toEqualTypeOf<"小" | "中" | "大">();
});
