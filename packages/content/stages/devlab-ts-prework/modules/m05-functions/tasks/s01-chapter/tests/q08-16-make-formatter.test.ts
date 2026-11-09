// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeFormatter } from "../src/q08-16-make-formatter";
test("問16 makeFormatter", () => {
  expect(makeFormatter("kg")(3)).toBe("3kg");
  expectTypeOf(makeFormatter).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeFormatter).returns.toEqualTypeOf<(n: number) => string>();
});
