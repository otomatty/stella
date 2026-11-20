// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ORIGIN } from "../src/q07-02-origin";
test("問2 ORIGIN", () => {
  expect(ORIGIN).toEqual({ x: 0, y: 0 });
  expectTypeOf<typeof ORIGIN>().toEqualTypeOf<{ readonly x: 0; readonly y: 0 }>();
});
