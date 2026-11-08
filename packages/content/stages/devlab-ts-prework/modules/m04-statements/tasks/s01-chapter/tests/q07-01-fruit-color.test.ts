// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fruitColor, type Fruit } from "../src/q07-01-fruit-color";
test("問1 fruitColor", () => {
  expect(fruitColor("apple")).toBe("赤");
  expect(fruitColor("banana")).toBe("黄");
  expect(fruitColor("cherry")).toBe("赤");
  expectTypeOf(fruitColor).parameters.toEqualTypeOf<[Fruit]>();
  expectTypeOf(fruitColor).returns.toEqualTypeOf<string>();
});
