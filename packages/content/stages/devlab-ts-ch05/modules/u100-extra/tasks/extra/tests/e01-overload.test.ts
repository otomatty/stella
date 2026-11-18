import { describe, expect, expectTypeOf, test } from "vitest";
import { convert, pick } from "../src/e01-overload";

describe("convert", () => {
  test("文字列は数値に、数値は文字列にする", () => {
    expect(convert("42")).toBe(42);
    expect(convert(42)).toBe("42");
  });

  test("引数の型で戻り値の型が決まる", () => {
    expectTypeOf(convert("42")).toEqualTypeOf<number>();
    expectTypeOf(convert(42)).toEqualTypeOf<string>();
  });
});

describe("pick", () => {
  test("index があれば要素、なければコピー", () => {
    const items = ["a", "b"];
    expect(pick(items, 1)).toBe("b");
    expect(pick(items, 5)).toBeUndefined();
    const copied = pick(items);
    expect(copied).toEqual(["a", "b"]);
    expect(copied).not.toBe(items);
  });

  test("引数の有無で戻り値の型が決まる", () => {
    expectTypeOf(pick(["a"], 0)).toEqualTypeOf<string | undefined>();
    expectTypeOf(pick(["a"])).toEqualTypeOf<string[]>();
  });
});
