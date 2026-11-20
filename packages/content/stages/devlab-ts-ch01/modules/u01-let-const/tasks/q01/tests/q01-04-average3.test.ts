// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { average3 } from "../src/q01-04-average3";
test("問4 average3", () => {
  expect(average3(1, 2, 6)).toBe(3);
  expect(average3(10, 20, 30)).toBe(20);
});
