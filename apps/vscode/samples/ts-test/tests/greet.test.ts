import { describe, expect, expectTypeOf, test } from "vitest";
import { greet } from "../src/greet";

describe("greet", () => {
  test("名前を入れたあいさつを返す", () => {
    expect(greet("山田")).toBe("こんにちは、山田さん");
  });

  test("引数と戻り値に型が付いている", () => {
    expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(greet).returns.toEqualTypeOf<string>();
  });
});
