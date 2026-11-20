// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseSeconds } from "../src/q08-07-parse-seconds";
test("問7 parseSeconds", () => {
  expect(parseSeconds("90s")).toBe(90);
  expect(parseSeconds("5m")).toBe(300);
  expect(parseSeconds("2h")).toBe(7200);
  expect(() => parseSeconds("3d")).toThrow("時間ではありません: 3d");
  expect(() => parseSeconds("xm")).toThrow("時間ではありません: xm");
  expectTypeOf(parseSeconds).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseSeconds).returns.toEqualTypeOf<number>();
});
