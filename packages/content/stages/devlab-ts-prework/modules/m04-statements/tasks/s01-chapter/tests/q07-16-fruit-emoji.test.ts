// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fruitEmoji, type Fruit } from "../src/q07-16-fruit-emoji";
test("問16 fruitEmoji", () => {
  expect(fruitEmoji("apple")).toBe("🍎");
  expect(fruitEmoji("banana")).toBe("🍌");
  expect(fruitEmoji("cherry")).toBe("🍒");
  expectTypeOf(fruitEmoji).parameters.toEqualTypeOf<[Fruit]>();
  expectTypeOf(fruitEmoji).returns.toEqualTypeOf<"🍎" | "🍌" | "🍒">();
});
