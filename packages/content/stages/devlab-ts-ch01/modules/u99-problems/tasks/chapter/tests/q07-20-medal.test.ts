// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { medal } from "../src/q07-20-medal";
test("問20 medal", () => {
  expect(medal(1)).toBe("金");
  expect(medal(2)).toBe("銀");
  expect(medal(3)).toBe("銅");
  expect(medal(4)).toBe("なし");
  expectTypeOf(medal).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(medal).returns.toEqualTypeOf<"金" | "銀" | "銅" | "なし">();
});
