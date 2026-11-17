// このファイルは書き換えないでください
import { expect, test } from "vitest";
import farewell from "../src/q05-16-farewell";
test("問16 farewell", () => {
  expect(farewell("山田")).toBe("さようなら、山田さん");
});
