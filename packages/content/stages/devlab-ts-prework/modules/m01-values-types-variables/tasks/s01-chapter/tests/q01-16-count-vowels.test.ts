// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { countVowels } from "../src/q01-16-count-vowels";
test("問16 countVowels", () => {
  expect(countVowels("education")).toBe(5);
  expect(countVowels("rhythm")).toBe(0);
  expect(countVowels("")).toBe(0);
});
