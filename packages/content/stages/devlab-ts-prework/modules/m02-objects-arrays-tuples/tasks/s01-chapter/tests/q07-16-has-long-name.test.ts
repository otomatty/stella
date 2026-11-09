// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasLongName, type Robot, type Product } from "../src/q07-16-has-long-name";
test("問16 hasLongName", () => {
  const robot: Robot = { name: "R2", version: 2 };
  const product: Product = { name: "ゴールデンデリシャス", price: 300, stock: 1 };
  expect(hasLongName(robot, 3)).toBe(false);
  expect(hasLongName(product, 3)).toBe(true);
  expectTypeOf(hasLongName).parameters.toEqualTypeOf<[{ name: string }, number]>();
  expectTypeOf(hasLongName).returns.toEqualTypeOf<boolean>();
});
