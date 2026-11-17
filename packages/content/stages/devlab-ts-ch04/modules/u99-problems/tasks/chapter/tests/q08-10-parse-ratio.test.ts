// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseRatio } from "../src/q08-10-parse-ratio";
test("問10 parseRatio", () => {
  expect(parseRatio("50%")).toBe(0.5);
  expect(parseRatio("100%")).toBe(1);
  expect(() => parseRatio("50")).toThrow("割合ではありません: 50");
  expectTypeOf(parseRatio).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseRatio).returns.toEqualTypeOf<number>();
});
