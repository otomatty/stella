// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ampm } from "../src/q03-13-ampm";
test("問13 ampm", () => {
  expect(ampm(0)).toBe("午前");
  expect(ampm(11)).toBe("午前");
  expect(ampm(13)).toBe("午後");
  expectTypeOf(ampm).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(ampm).returns.toEqualTypeOf<"午前" | "午後">();
});
