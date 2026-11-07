// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { siteTitle } from "../src/q05-09-site-title";
test("問9 siteTitle", () => {
  expect(siteTitle("商品一覧")).toBe("商品一覧 | サンプル商店");
  expectTypeOf(siteTitle).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(siteTitle).returns.toEqualTypeOf<string>();
});
