// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { countDown } from "../src/q01-07-count-down";
test("問7 countDown", () => {
  expect(countDown(3)).toBe("3, 2, 1, 発射");
  expect(countDown(1)).toBe("1, 発射");
  expect(countDown(0)).toBe("発射");
});
