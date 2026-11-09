// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greetGuest } from "../src/q04-01-greet-guest";
test("問1 greetGuest", () => {
  expect(greetGuest()).toBe("こんにちは、ゲストさん");
  expect(greetGuest("山田")).toBe("こんにちは、山田さん");
  expectTypeOf(greetGuest).parameters.toEqualTypeOf<[string?]>();
  expectTypeOf(greetGuest).returns.toEqualTypeOf<string>();
});
