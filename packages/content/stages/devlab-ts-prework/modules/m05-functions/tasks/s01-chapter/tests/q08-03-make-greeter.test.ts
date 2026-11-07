// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeGreeter } from "../src/q08-03-make-greeter";
test("問3 makeGreeter", () => {
  expect(makeGreeter("おはよう")("山田")).toBe("おはよう、山田さん");
  expectTypeOf(makeGreeter).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeGreeter).returns.toEqualTypeOf<(name: string) => string>();
});
