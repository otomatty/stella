// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { freezeOptions, type Options } from "../src/q03-08-freeze-options";
test("問8 freezeOptions", () => {
  const frozen = freezeOptions({ size: 12, color: "red", bold: false });
  expect(Object.isFrozen(frozen)).toBe(true);
  expect(() => {
    // @ts-expect-error 読み取り専用なので代入できない
    frozen.size = 1;
  }).toThrow(TypeError);
  expectTypeOf(freezeOptions).parameters.toEqualTypeOf<[Options]>();
  expectTypeOf(freezeOptions).returns.toEqualTypeOf<Readonly<Options>>();
});
