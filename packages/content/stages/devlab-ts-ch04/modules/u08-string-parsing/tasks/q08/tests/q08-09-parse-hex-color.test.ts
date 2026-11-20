// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseHexColor } from "../src/q08-09-parse-hex-color";
test("問9 parseHexColor", () => {
  expect(parseHexColor("#ff0000")).toEqual([255, 0, 0]);
  expect(parseHexColor("#00ff80")).toEqual([0, 255, 128]);
  expect(() => parseHexColor("ff0000")).toThrow("色ではありません: ff0000");
  expectTypeOf(parseHexColor).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseHexColor).returns.toEqualTypeOf<[number, number, number]>();
});
