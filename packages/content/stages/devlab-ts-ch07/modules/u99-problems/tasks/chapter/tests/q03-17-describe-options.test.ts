// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { describeOptions, type Options } from "../src/q03-17-describe-options";
test("問17 describeOptions", () => {
  expect(describeOptions({ size: 12, color: "black", bold: true })).toBe("12px black 太字");
  expect(describeOptions({ size: 10, color: "red", bold: false })).toBe("10px red");
  expectTypeOf(describeOptions).parameters.toEqualTypeOf<[Readonly<Options>]>();
  expectTypeOf(describeOptions).returns.toEqualTypeOf<string>();
});
