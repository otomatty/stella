// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { eachWithIndex } from "../src/q07-03-each-with-index";
test("問3 eachWithIndex", () => {
  const calls: string[] = [];
  eachWithIndex(["a", "b"], (item, index) => {
    calls.push(`${index}:${item}`);
  });
  expect(calls).toEqual(["0:a", "1:b"]);
  expectTypeOf(eachWithIndex).parameters.toEqualTypeOf<
    [readonly string[], (item: string, index: number) => void]
  >();
  expectTypeOf(eachWithIndex).returns.toBeVoid();
});
