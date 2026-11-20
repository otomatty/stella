// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greet } from "../src/q08-02-greet";
test("問2 greet", () => {
  expect(greet("山田")).toBe("こんにちは、山田さん");
  expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(greet).returns.toEqualTypeOf<string>();
});
