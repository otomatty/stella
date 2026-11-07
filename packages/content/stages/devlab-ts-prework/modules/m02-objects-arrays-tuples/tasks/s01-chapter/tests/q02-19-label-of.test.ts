// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { labelOf } from "../src/q02-19-label-of";
test("問19 labelOf", () => {
  expect(labelOf({ id: 7, label: "会議室A" })).toBe("会議室A");
  expect(labelOf({ id: 7 })).toBe("#7");
  expectTypeOf(labelOf).parameters.toEqualTypeOf<[{ id: number; label?: string }]>();
  expectTypeOf(labelOf).returns.toEqualTypeOf<string>();
});
