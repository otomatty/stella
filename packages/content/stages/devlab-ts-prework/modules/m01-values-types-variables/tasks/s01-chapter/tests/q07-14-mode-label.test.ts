// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { modeLabel } from "../src/q07-14-mode-label";
test("問14 modeLabel", () => {
  expect(modeLabel("light")).toBe("ライトモード");
  expect(modeLabel("dark")).toBe("ダークモード");
  expectTypeOf(modeLabel).parameters.toEqualTypeOf<["light" | "dark"]>();
  expectTypeOf(modeLabel).returns.toEqualTypeOf<"ライトモード" | "ダークモード">();
});
