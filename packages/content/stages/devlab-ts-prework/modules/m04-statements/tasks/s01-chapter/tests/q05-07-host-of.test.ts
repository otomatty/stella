// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hostOf } from "../src/q05-07-host-of";
test("問7 hostOf", () => {
  expect(hostOf("https://example.com/path")).toBe("example.com");
  expect(hostOf("not a url")).toBe("");
  expectTypeOf(hostOf).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(hostOf).returns.toEqualTypeOf<string>();
});
