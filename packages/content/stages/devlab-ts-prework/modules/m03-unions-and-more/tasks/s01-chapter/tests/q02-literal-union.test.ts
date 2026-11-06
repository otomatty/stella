import { describe, expect, expectTypeOf, test } from "vitest";
import { type Size, parseSize, priceOf, upsize } from "../src/q02-literal-union";

test("Size の型", () => {
  expectTypeOf<Size>().toEqualTypeOf<"S" | "M" | "L">();
});

describe("priceOf", () => {
  test("サイズごとの価格を返す", () => {
    expect(priceOf("S")).toBe(300);
    expect(priceOf("M")).toBe(400);
    expect(priceOf("L")).toBe(500);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(priceOf).parameters.toEqualTypeOf<[Size]>();
    expectTypeOf(priceOf).returns.toEqualTypeOf<number>();
    // @ts-expect-error "XL" は Size ではない
    expectTypeOf(priceOf).toBeCallableWith("XL");
  });
});

describe("parseSize", () => {
  test("S、M、L なら Size を返す", () => {
    expect(parseSize("S")).toBe("S");
    expect(parseSize(" m ")).toBe("M");
    expect(parseSize("l")).toBe("L");
  });

  test("それ以外なら undefined", () => {
    expect(parseSize("XL")).toBeUndefined();
    expect(parseSize("")).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(parseSize).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseSize).returns.toEqualTypeOf<Size | undefined>();
  });
});

describe("upsize", () => {
  test("1つ大きいサイズを返す。L は L のまま", () => {
    expect(upsize("S")).toBe("M");
    expect(upsize("M")).toBe("L");
    expect(upsize("L")).toBe("L");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(upsize).parameters.toEqualTypeOf<[Size]>();
    expectTypeOf(upsize).returns.toEqualTypeOf<Size>();
  });
});
