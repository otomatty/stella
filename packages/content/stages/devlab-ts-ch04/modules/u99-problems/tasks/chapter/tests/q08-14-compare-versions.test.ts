// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { compareVersions } from "../src/q08-14-compare-versions";
test("問14 compareVersions", () => {
  expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
  expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
  expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  expectTypeOf(compareVersions).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(compareVersions).returns.toEqualTypeOf<-1 | 0 | 1>();
});
