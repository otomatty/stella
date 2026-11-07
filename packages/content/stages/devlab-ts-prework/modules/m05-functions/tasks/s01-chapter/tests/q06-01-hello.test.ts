// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hello } from "../src/q06-01-hello";
test("問1 hello", () => {
  expect(hello({ name: "山田" })).toBe("こんにちは、山田さん");
  expectTypeOf(hello).parameters.toEqualTypeOf<[{ name: string }]>();
  expectTypeOf(hello).returns.toEqualTypeOf<string>();
});
