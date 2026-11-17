import { describe, expect, test } from "vitest";
import formatYen from "../src/q05-modules-format";

describe("q05-modules-format.ts", () => {
  test("formatYen はデフォルト export", () => {
    expect(formatYen(1234)).toBe("1,234円");
  });
});
