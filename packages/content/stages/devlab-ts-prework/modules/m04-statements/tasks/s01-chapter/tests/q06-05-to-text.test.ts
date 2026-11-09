// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toText } from "../src/q06-05-to-text";
test("問5 toText", () => {
  expect(toText("a")).toBe("a");
  expect(toText(1.5)).toBe("1.5");
  expect(toText(true)).toBe("true");
  expect(toText(null)).toBe("null");
  expect(toText(undefined)).toBe("undefined");
  expect(toText({ a: 1 })).toBe("[object]");
  expectTypeOf(toText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(toText).returns.toEqualTypeOf<string>();
});
