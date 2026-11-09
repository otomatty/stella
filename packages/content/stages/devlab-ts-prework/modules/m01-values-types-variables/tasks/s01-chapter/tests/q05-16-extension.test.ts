// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { extension } from "../src/q05-16-extension";
test("問16 extension", () => {
  expect(extension("photo.jpeg")).toBe("jpeg");
  expect(extension("archive.tar.gz")).toBe("gz");
  expect(extension("README")).toBe("");
  expectTypeOf(extension).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(extension).returns.toEqualTypeOf<string>();
});
