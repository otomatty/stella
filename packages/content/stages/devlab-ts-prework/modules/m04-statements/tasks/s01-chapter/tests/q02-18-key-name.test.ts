// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { keyName } from "../src/q02-18-key-name";
test("問18 keyName", () => {
  expect(keyName(13)).toBe("Enter");
  expect(keyName(27)).toBe("Escape");
  expect(keyName(32)).toBe("Space");
  expect(keyName(65)).toBe("Other");
  expectTypeOf(keyName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(keyName).returns.toEqualTypeOf<string>();
});
