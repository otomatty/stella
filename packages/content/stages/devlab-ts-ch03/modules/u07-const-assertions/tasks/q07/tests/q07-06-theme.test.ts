// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { THEME } from "../src/q07-06-theme";
test("問6 THEME", () => {
  expect(THEME).toEqual({ primary: "#0066ff", radius: 4 });
  expectTypeOf<typeof THEME>().toEqualTypeOf<{ readonly primary: "#0066ff"; readonly radius: 4 }>();
});
