// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { add, sub } from "../src/q05-04-add";
test("問4 add", () => {
  expect(add(1, 2)).toBe(3);
  expect(sub(5, 3)).toBe(2);
});
