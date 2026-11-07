// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { SITE_NAME } from "../src/q03-01-site-name";
test("問1 SITE_NAME", () => {
  expect(SITE_NAME).toBe("Agora");
  expectTypeOf<typeof SITE_NAME>().toEqualTypeOf<"Agora">();
});
