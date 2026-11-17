// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { elementOf } from "../src/q02-19-element-of";
test("問19 elementOf", () => {
  expect(elementOf("牡羊")).toBe("火");
  expect(elementOf("射手")).toBe("火");
  expect(elementOf("乙女")).toBe("地");
  expectTypeOf(elementOf).parameters.toEqualTypeOf<
    ["牡羊" | "獅子" | "射手" | "牡牛" | "乙女" | "山羊"]
  >();
  expectTypeOf(elementOf).returns.toEqualTypeOf<"火" | "地">();
});
