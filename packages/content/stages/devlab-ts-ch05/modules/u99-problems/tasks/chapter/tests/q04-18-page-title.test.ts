// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pageTitle } from "../src/q04-18-page-title";
test("問18 pageTitle", () => {
  expect(pageTitle("設定")).toBe("設定 | Agora");
  expect(pageTitle("設定", "Lab")).toBe("設定 | Lab");
  expectTypeOf(pageTitle).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(pageTitle).returns.toEqualTypeOf<string>();
});
