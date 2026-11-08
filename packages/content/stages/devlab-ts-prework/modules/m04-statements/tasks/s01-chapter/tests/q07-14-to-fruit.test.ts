// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toFruit, type Fruit } from "../src/q07-14-to-fruit";
test("問14 toFruit", () => {
  expect(toFruit("apple")).toBe("apple");
  expect(() => toFruit("grape")).toThrow("果物ではありません: grape");
  expectTypeOf(toFruit).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toFruit).returns.toEqualTypeOf<Fruit>();
});
