import { describe, expect, expectTypeOf, test } from "vitest";
import { joinPath, maxOf, sumAll, tagged } from "../src/q05-rest-params";

describe("sumAll", () => {
  test("すべて足す", () => {
    expect(sumAll(1, 2, 3)).toBe(6);
    expect(sumAll(5)).toBe(5);
    expect(sumAll()).toBe(0);
  });

  test("配列はスプレッド構文で渡せる", () => {
    const numbers = [4, 5, 6];
    expect(sumAll(...numbers)).toBe(15);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sumAll).parameters.toEqualTypeOf<number[]>();
    expectTypeOf(sumAll).returns.toEqualTypeOf<number>();
  });
});

describe("maxOf", () => {
  test("最大値を返す", () => {
    expect(maxOf(3, 9, 2)).toBe(9);
    expect(maxOf(-1)).toBe(-1);
  });

  test("引数と戻り値の型。引数なしでは呼べない", () => {
    expectTypeOf(maxOf).parameters.toEqualTypeOf<[number, ...number[]]>();
    expectTypeOf(maxOf).returns.toEqualTypeOf<number>();
    // @ts-expect-error 引数が1つもない呼び出しはできない
    expectTypeOf(maxOf).toBeCallableWith();
  });
});

describe("joinPath", () => {
  test("前後の / を取り除いてつなぐ", () => {
    expect(joinPath("a/", "/b", "", "c")).toBe("a/b/c");
    expect(joinPath("users", "42")).toBe("users/42");
    expect(joinPath()).toBe("");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(joinPath).parameters.toEqualTypeOf<string[]>();
    expectTypeOf(joinPath).returns.toEqualTypeOf<string>();
  });
});

describe("tagged", () => {
  test("[tag] に続けて items を並べる", () => {
    expect(tagged("info", "a", "b", "c")).toBe("[info] a, b, c");
    expect(tagged("empty")).toBe("[empty]");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(tagged).parameters.toEqualTypeOf<[string, ...string[]]>();
    expectTypeOf(tagged).returns.toEqualTypeOf<string>();
  });
});
