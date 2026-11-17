// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { windLevel } from "../src/q01-16-wind-level";
test("問16 windLevel", () => {
  expect(windLevel(4)).toBe("弱い");
  expect(windLevel(7)).toBe("やや強い");
  expect(windLevel(10)).toBe("強い");
  expectTypeOf(windLevel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(windLevel).returns.toEqualTypeOf<"弱い" | "やや強い" | "強い">();
});
