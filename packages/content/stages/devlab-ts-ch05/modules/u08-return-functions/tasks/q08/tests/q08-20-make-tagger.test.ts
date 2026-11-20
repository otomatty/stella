// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeTagger } from "../src/q08-20-make-tagger";
test("問20 makeTagger", () => {
  expect(makeTagger("b")("太字")).toBe("<b>太字</b>");
  expectTypeOf(makeTagger).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeTagger).returns.toEqualTypeOf<(text: string) => string>();
});
