// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { hasAllKeys } from "../src/q07-17-has-all-keys";
test("問17 hasAllKeys", () => {
  const value: { a: number; b?: string } = { a: 1 };
  expect(hasAllKeys(value, ["a"])).toBe(true);
  expect(hasAllKeys(value, ["a", "b"])).toBe(false);
  const call = () => {
    // @ts-expect-error c は value のプロパティではない
    hasAllKeys(value, ["c"]);
  };
  expect(typeof call).toBe("function");
});
