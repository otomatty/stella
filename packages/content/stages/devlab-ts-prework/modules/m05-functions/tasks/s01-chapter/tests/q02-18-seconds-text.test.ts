// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { secondsText } from "../src/q02-18-seconds-text";
test("問18 secondsText", () => {
  expect(secondsText(1500)).toBe("1.5秒");
  expect(secondsText(200)).toBe("0.2秒");
  expectTypeOf(secondsText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(secondsText).returns.toEqualTypeOf<string>();
});
