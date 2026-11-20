// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greetingFor } from "../src/q01-10-greeting-for";
test("問10 greetingFor", () => {
  expect(greetingFor(5)).toBe("おはよう");
  expect(greetingFor(11)).toBe("こんにちは");
  expect(greetingFor(18)).toBe("こんばんは");
  expect(greetingFor(2)).toBe("こんばんは");
  expectTypeOf(greetingFor).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(greetingFor).returns.toEqualTypeOf<"おはよう" | "こんにちは" | "こんばんは">();
});
