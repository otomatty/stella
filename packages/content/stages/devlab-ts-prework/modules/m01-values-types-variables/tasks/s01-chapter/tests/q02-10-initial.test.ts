// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { initial } from "../src/q02-10-initial";
test("問10 initial", () => {
  expect(initial("Taro")).toBe("T");
  expect(initial("山田")).toBe("山");
  expectTypeOf(initial).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(initial).returns.toEqualTypeOf<string>();
});
