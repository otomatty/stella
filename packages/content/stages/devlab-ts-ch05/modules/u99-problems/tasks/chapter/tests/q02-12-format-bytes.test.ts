// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { formatBytes } from "../src/q02-12-format-bytes";
test("問12 formatBytes", () => {
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1536)).toBe("1.5 KB");
  expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  expectTypeOf(formatBytes).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(formatBytes).returns.toEqualTypeOf<string>();
});
