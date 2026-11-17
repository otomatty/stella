// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { welcome } from "../src/q05-08-welcome";
test("問8 welcome", () => {
  expect(welcome("山田")).toBe("ようこそ、山田さん！");
  expectTypeOf(welcome).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(welcome).returns.toEqualTypeOf<string>();
});
