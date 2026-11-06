import { describe, expect, expectTypeOf, test } from "vitest";
import { maskEmail, slugify, truncate } from "../src/q05-string";

describe("slugify", () => {
  test("前後の空白を取り除き、小文字にし、間の空白をハイフンにする", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("  Hello TypeScript   World ")).toBe("hello-typescript-world");
    expect(slugify("agora")).toBe("agora");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(slugify).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(slugify).returns.toEqualTypeOf<string>();
  });
});

describe("truncate", () => {
  test("max 文字を超えたら、全体が max 文字になるように切って「…」を付ける", () => {
    expect(truncate("TypeScript入門", 6)).toBe("TypeS…");
    expect(truncate("abcdefg", 6)).toBe("abcde…");
  });

  test("max 文字以下なら、そのまま返す", () => {
    expect(truncate("短い文", 10)).toBe("短い文");
    expect(truncate("abcdef", 6)).toBe("abcdef");
  });

  test("max が 1 より小さければ Error を投げる", () => {
    expect(() => truncate("abc", 0)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(truncate).parameters.toEqualTypeOf<[string, number]>();
    expectTypeOf(truncate).returns.toEqualTypeOf<string>();
  });
});

describe("maskEmail", () => {
  test("「@」より前を、先頭1文字と *** に置き換える", () => {
    expect(maskEmail("taro@example.com")).toBe("t***@example.com");
    expect(maskEmail("a@b.jp")).toBe("a***@b.jp");
  });

  test("「@」がない、または「@」より前が空なら Error を投げる", () => {
    expect(() => maskEmail("example.com")).toThrow(Error);
    expect(() => maskEmail("@example.com")).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(maskEmail).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(maskEmail).returns.toEqualTypeOf<string>();
  });
});
