// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { honorific } from "../src/q02-02-honorific";
test("問2 honorific", () => {
  expect(honorific("山田")).toBe("山田さん");
  expect(honorific("Taro")).toBe("Taroさん");
  expectTypeOf(honorific).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(honorific).returns.toEqualTypeOf<string>();
});
