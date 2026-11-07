// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { sortByKey } from "../src/q08-05-sort-by-key";
test("問5 sortByKey", () => {
  expect(sortByKey([{ n: 2 }, { n: 1 }], (x) => x.n)).toEqual([{ n: 1 }, { n: 2 }]);
});
