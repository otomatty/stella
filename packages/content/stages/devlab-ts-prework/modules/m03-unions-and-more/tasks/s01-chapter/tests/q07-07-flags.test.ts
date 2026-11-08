// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { FLAGS } from "../src/q07-07-flags";
test("問7 FLAGS", () => {
  expect(FLAGS).toEqual({ beta: true, debug: false });
  expectTypeOf<typeof FLAGS>().toEqualTypeOf<{ readonly beta: true; readonly debug: false }>();
});
