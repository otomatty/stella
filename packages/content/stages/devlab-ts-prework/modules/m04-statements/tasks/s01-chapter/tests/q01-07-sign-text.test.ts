// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { signText } from "../src/q01-07-sign-text";
test("問7 signText", () => {
  expect(signText(3)).toBe("正");
  expect(signText(-2)).toBe("負");
  expect(signText(0)).toBe("ゼロ");
  expectTypeOf(signText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(signText).returns.toEqualTypeOf<"正" | "負" | "ゼロ">();
});
