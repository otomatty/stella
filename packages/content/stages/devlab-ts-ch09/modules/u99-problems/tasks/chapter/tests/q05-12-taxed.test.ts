// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { taxed } from "../src/q05-12-taxed";
test("問12 taxed", async () => {
  const lib = await import("../src/shared/q05-modules.lib");
  expect(taxed).toBe(lib.priceWithTax);
  expect(taxed(200)).toBe(220);
});
