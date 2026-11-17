// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { formatYen } from "../src/q05-11-format-yen";
test("問11 formatYen", async () => {
  const lib = await import("../src/shared/q05-modules.lib");
  expect(formatYen).toBe(lib.formatYen);
});
