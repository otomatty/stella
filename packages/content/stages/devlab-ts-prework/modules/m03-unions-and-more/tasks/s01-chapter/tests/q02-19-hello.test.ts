// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hello, type Lang } from "../src/q02-19-hello";
test("問19 hello", () => {
  expectTypeOf<Lang>().toEqualTypeOf<"ja" | "en">();
  expect(hello("ja")).toBe("こんにちは");
  expect(hello("en")).toBe("Hello");
  expectTypeOf(hello).parameters.toEqualTypeOf<[Lang]>();
  expectTypeOf(hello).returns.toEqualTypeOf<"こんにちは" | "Hello">();
});
