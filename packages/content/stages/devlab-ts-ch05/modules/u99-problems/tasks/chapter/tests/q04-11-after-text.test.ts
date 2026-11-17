// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { afterText } from "../src/q04-11-after-text";
test("問11 afterText", () => {
  expect(afterText()).toBe("1秒後");
  expect(afterText(30)).toBe("30秒後");
  expectTypeOf(afterText).parameters.toEqualTypeOf<[number?]>();
  expectTypeOf(afterText).returns.toEqualTypeOf<string>();
});
