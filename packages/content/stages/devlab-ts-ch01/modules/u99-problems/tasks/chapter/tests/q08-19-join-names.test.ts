// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinNames } from "../src/q08-19-join-names";
test("問19 joinNames", () => {
  expect(joinNames("山田", "佐藤")).toBe("山田・佐藤");
  expectTypeOf(joinNames).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(joinNames).returns.toEqualTypeOf<string>();
});
