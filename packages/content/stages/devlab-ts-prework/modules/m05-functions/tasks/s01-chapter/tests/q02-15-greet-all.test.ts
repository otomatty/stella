// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greetAll } from "../src/q02-15-greet-all";
test("問15 greetAll", () => {
  expect(greetAll(["山田", "佐藤"])).toEqual(["山田さん、こんにちは", "佐藤さん、こんにちは"]);
  expectTypeOf(greetAll).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(greetAll).returns.toEqualTypeOf<string[]>();
});
