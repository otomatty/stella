// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { topName } from "../src/q01-15-top-name";
test("問15 topName", () => {
  expect(
    topName(
      new Map([
        ["山田", 80],
        ["佐藤", 95],
        ["鈴木", 95],
      ]),
    ),
  ).toBe("佐藤");
  expect(topName(new Map())).toBeUndefined();
  expectTypeOf(topName).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(topName).returns.toEqualTypeOf<string | undefined>();
});
