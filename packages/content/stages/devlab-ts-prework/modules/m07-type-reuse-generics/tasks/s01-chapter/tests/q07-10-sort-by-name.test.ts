// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortByName } from "../src/q07-10-sort-by-name";
test("問10 sortByName", () => {
  const rows = [
    { name: "b", age: 1 },
    { name: "a", age: 2 },
  ];
  expect(sortByName(rows).map((r) => r.name)).toEqual(["a", "b"]);
  expectTypeOf(sortByName(rows)).toEqualTypeOf<{ name: string; age: number }[]>();
  const call = () => {
    // @ts-expect-error name を持たない要素は渡せない
    sortByName([{ title: "x" }]);
  };
  expect(typeof call).toBe("function");
});
