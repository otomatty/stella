// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { latLngText } from "../src/q06-20-lat-lng-text";
test("問20 latLngText", () => {
  expect(latLngText([35.68, 139.76])).toBe("35.68, 139.76");
  expectTypeOf(latLngText).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(latLngText).returns.toEqualTypeOf<string>();
});
