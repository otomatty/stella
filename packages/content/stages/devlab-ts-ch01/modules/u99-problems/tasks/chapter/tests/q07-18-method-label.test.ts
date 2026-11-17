// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { methodLabel } from "../src/q07-18-method-label";
test("問18 methodLabel", () => {
  expect(methodLabel("GET")).toBe("取得");
  expect(methodLabel("POST")).toBe("作成");
  expect(methodLabel("DELETE")).toBe("削除");
  expectTypeOf(methodLabel).parameters.toEqualTypeOf<["GET" | "POST" | "DELETE"]>();
  expectTypeOf(methodLabel).returns.toEqualTypeOf<"取得" | "作成" | "削除">();
});
