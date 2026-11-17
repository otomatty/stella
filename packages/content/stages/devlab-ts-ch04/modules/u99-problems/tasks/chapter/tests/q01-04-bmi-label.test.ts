// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bmiLabel } from "../src/q01-04-bmi-label";
test("問4 bmiLabel", () => {
  expect(bmiLabel(18)).toBe("やせ");
  expect(bmiLabel(18.5)).toBe("普通");
  expect(bmiLabel(25)).toBe("肥満");
  expectTypeOf(bmiLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(bmiLabel).returns.toEqualTypeOf<"やせ" | "普通" | "肥満">();
});
