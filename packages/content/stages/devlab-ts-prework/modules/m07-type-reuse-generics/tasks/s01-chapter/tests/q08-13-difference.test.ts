// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { difference } from "../src/q08-13-difference";
test("問13 difference", () => {
  expect(difference([1, 2, 3], [2])).toEqual([1, 3]);
  expect(difference(["a"], ["a"])).toEqual([]);
});
