import { describe, expect, expectTypeOf, test } from "vitest";
import { type Box, box, first, last, pair, repeat, unbox } from "../src/q06-type-variables";

const numbers: number[] = [3, 1, 2];
const words: string[] = ["a", "b"];

describe("first と last", () => {
  test("最初と最後", () => {
    expect(first(numbers)).toBe(3);
    expect(last(words)).toBe("b");
    const empty: number[] = [];
    expect(first(empty)).toBeUndefined();
    expect(last(empty)).toBeUndefined();
  });

  test("戻り値の型が要素の型になる", () => {
    expectTypeOf(first(numbers)).toEqualTypeOf<number | undefined>();
    expectTypeOf(first(words)).toEqualTypeOf<string | undefined>();
    expectTypeOf(last(numbers)).toEqualTypeOf<number | undefined>();
    expectTypeOf(last(words)).toEqualTypeOf<string | undefined>();
  });
});

describe("repeat", () => {
  test("times 個並べる", () => {
    expect(repeat("x", 3)).toEqual(["x", "x", "x"]);
    expect(repeat(0, 0)).toEqual([]);
  });

  test("戻り値の型", () => {
    const n = numbers.length;
    const s = words.join("");
    expectTypeOf(repeat(n, 2)).toEqualTypeOf<number[]>();
    expectTypeOf(repeat(s, 2)).toEqualTypeOf<string[]>();
  });
});

describe("pair", () => {
  test("タプルにする", () => {
    expect(pair("a", 1)).toEqual(["a", 1]);
  });

  test("戻り値の型", () => {
    const n = numbers.length;
    const s = words.join("");
    expectTypeOf(pair(s, n)).toEqualTypeOf<[string, number]>();
    expectTypeOf(pair(n, words)).toEqualTypeOf<[number, string[]]>();
  });
});

describe("Box", () => {
  test("入れて、取り出す", () => {
    expect(box(5)).toEqual({ value: 5 });
    expect(unbox({ value: "a" })).toBe("a");
  });

  test("型", () => {
    expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
    const s = words.join("");
    expectTypeOf(box(s)).toEqualTypeOf<Box<string>>();
    const b: Box<number> = { value: 1 };
    expectTypeOf(unbox(b)).toEqualTypeOf<number>();
  });
});
