// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { library } from "../src/q05-15-library";
test("問15 library", async () => {
  const lib = await import("../src/shared/q05-modules.lib");
  expect(library.SITE_NAME).toBe("サンプル商店");
  expect(library.priceWithTax).toBe(lib.priceWithTax);
});
