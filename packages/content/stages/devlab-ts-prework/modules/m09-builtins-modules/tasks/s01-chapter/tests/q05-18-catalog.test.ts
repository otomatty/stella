// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { catalog } from "../src/q05-18-catalog";
test("問18 catalog", () => {
  expect(catalog()).toBe("サンプル商店: りんご、みかん、ぶどう");
  expectTypeOf(catalog).parameters.toEqualTypeOf<[]>();
  expectTypeOf(catalog).returns.toEqualTypeOf<string>();
});
