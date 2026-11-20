// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPng } from "../src/q05-07-is-png";
test("問7 isPng", () => {
  expect(isPng("photo.png")).toBe(true);
  expect(isPng("photo.PNG")).toBe(true);
  expect(isPng("photo.jpg")).toBe(false);
  expectTypeOf(isPng).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isPng).returns.toEqualTypeOf<boolean>();
});
