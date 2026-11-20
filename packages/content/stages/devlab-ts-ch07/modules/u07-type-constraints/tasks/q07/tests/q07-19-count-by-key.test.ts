// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countByKey } from "../src/q07-19-count-by-key";
test("問19 countByKey", () => {
  expect(countByKey(["apple", "avocado", "banana"], (w) => w.slice(0, 1))).toEqual({ a: 2, b: 1 });
  const result = countByKey([1, 2, 3], (n): "odd" | "even" => (n % 2 === 0 ? "even" : "odd"));
  expect(result).toEqual({ odd: 2, even: 1 });
  expectTypeOf(result).toEqualTypeOf<Partial<Record<"odd" | "even", number>>>();
});
