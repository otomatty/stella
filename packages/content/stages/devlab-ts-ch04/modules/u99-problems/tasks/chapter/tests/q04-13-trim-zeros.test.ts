// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { trimZeros } from "../src/q04-13-trim-zeros";
test("問13 trimZeros", () => {
  expect(trimZeros("00120")).toBe("120");
  expect(trimZeros("000")).toBe("0");
  expect(trimZeros("5")).toBe("5");
  expectTypeOf(trimZeros).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(trimZeros).returns.toEqualTypeOf<string>();
});
