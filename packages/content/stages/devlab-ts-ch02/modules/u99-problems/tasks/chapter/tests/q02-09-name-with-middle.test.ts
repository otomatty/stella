// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameWithMiddle } from "../src/q02-09-name-with-middle";
test("問9 nameWithMiddle", () => {
  expect(nameWithMiddle({ first: "John", middle: "F", last: "Kennedy" })).toBe("John F Kennedy");
  expect(nameWithMiddle({ first: "Taro", last: "Yamada" })).toBe("Taro Yamada");
  expectTypeOf(nameWithMiddle).parameters.toEqualTypeOf<
    [{ first: string; middle?: string; last: string }]
  >();
  expectTypeOf(nameWithMiddle).returns.toEqualTypeOf<string>();
});
