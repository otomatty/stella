// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { formatYen } from "../src/q02-12-format-yen";
test("問12 formatYen", () => {
  expect(formatYen(1234)).toBe("1,234円");
  expect(formatYen(1000000)).toBe("1,000,000円");
  expectTypeOf(formatYen).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(formatYen).returns.toEqualTypeOf<string>();
});
