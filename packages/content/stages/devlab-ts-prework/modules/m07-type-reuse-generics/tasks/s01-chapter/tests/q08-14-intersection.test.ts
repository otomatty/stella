// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { intersection } from "../src/q08-14-intersection";
test("問14 intersection", () => {
  expect(intersection([1, 2, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  expect(intersection(["a"], ["b"])).toEqual([]);
});
