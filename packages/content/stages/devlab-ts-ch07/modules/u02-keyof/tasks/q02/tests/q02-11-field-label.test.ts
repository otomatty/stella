// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fieldLabel } from "../src/q02-11-field-label";
test("問11 fieldLabel", () => {
  expect(fieldLabel("id")).toBe("ID");
  expect(fieldLabel("email")).toBe("メール");
  expect(fieldLabel("age")).toBe("年齢");
  expectTypeOf(fieldLabel).parameters.toEqualTypeOf<["id" | "name" | "email" | "age"]>();
  expectTypeOf(fieldLabel).returns.toEqualTypeOf<string>();
});
