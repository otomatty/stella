// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shortest } from "../src/q07-02-shortest";
test("問2 shortest", () => {
  const words: string[] = ["abc", "a", "ab"];
  expect(shortest(words)).toBe("a");
  expect(shortest([[1, 2], [3]])).toEqual([3]);
  expectTypeOf(shortest(words)).toEqualTypeOf<string | undefined>();
  const call = () => {
    // @ts-expect-error 数値には length がない
    shortest([1, 2]);
  };
  expect(typeof call).toBe("function");
});
