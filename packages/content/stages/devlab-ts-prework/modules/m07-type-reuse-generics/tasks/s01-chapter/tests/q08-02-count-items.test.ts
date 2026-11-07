// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { countItems } from "../src/q08-02-count-items";
test("問2 countItems", () => {
  expect(countItems([1, 2, 3], (n) => (n % 2 === 0 ? "偶数" : "奇数"))).toEqual({
    奇数: 2,
    偶数: 1,
  });
});
