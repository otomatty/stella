// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { phoneText } from "../src/q03-14-phone-text";
test("問14 phoneText", () => {
  expect(phoneText({ phone: "090-0000-0000" })).toBe("090-0000-0000");
  expect(phoneText({ phone: null })).toBe("なし");
  expect(phoneText({})).toBe("なし");
  expectTypeOf(phoneText).parameters.toEqualTypeOf<[{ phone?: string | null }]>();
  expectTypeOf(phoneText).returns.toEqualTypeOf<string>();
});
