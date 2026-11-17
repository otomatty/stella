import { describe, expect, expectTypeOf, test } from "vitest";
import { createTag, formatName, greet } from "../src/q03-optional-params";

describe("greet", () => {
  test("title の有無で呼び方を変える", () => {
    expect(greet("山田", "部長")).toBe("山田部長、こんにちは");
    expect(greet("山田")).toBe("山田さん、こんにちは");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(greet).parameters.toEqualTypeOf<[string, string?]>();
    expectTypeOf(greet).returns.toEqualTypeOf<string>();
  });
});

describe("formatName", () => {
  test("渡された部分だけをつなぐ", () => {
    expect(formatName("Kennedy", "John", "F")).toBe("Kennedy F John");
    expect(formatName("山田", "太郎")).toBe("山田 太郎");
    expect(formatName("山田")).toBe("山田");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(formatName).parameters.toEqualTypeOf<[string, string?, string?]>();
    expectTypeOf(formatName).returns.toEqualTypeOf<string>();
  });
});

describe("createTag", () => {
  test("color がなければ gray", () => {
    expect(createTag("重要", "red")).toEqual({ name: "重要", color: "red" });
    expect(createTag("メモ")).toEqual({ name: "メモ", color: "gray" });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(createTag).parameters.toEqualTypeOf<[string, string?]>();
    expectTypeOf(createTag).returns.toEqualTypeOf<{ name: string; color: string }>();
  });
});
