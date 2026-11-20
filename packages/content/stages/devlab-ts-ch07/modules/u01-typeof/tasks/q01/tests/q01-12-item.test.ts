// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Item } from "../src/q01-12-item";
test("問12 Item", () => {
  expectTypeOf<Item>().toEqualTypeOf<{ name: string; price: number; createdAt: number }>();
});
