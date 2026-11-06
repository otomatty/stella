import { describe, expect, expectTypeOf, test } from "vitest";
import { formatPrice, paginate, repeatText } from "../src/q04-default-params";

const items = Array.from({ length: 25 }, (_, i) => `item${i + 1}`);

describe("paginate", () => {
  test("省略すると 1ページ目、10件ずつ", () => {
    expect(paginate(items)).toHaveLength(10);
    expect(paginate(items)[0]).toBe("item1");
  });

  test("ページと件数を指定できる", () => {
    expect(paginate(items, 3)).toEqual(["item21", "item22", "item23", "item24", "item25"]);
    expect(paginate(items, 2, 5)).toEqual(["item6", "item7", "item8", "item9", "item10"]);
    expect(paginate(items, 4)).toEqual([]);
  });

  test("page が 1 未満なら Error", () => {
    expect(() => paginate(items, 0)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(paginate).parameters.toEqualTypeOf<[readonly string[], number?, number?]>();
    expectTypeOf(paginate).returns.toEqualTypeOf<string[]>();
  });
});

describe("repeatText", () => {
  test("省略すると2回、区切りなし", () => {
    expect(repeatText("ab")).toBe("abab");
  });

  test("回数と区切りを指定できる", () => {
    expect(repeatText("ab", 3, "-")).toBe("ab-ab-ab");
    expect(repeatText("ab", 1)).toBe("ab");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(repeatText).parameters.toEqualTypeOf<[string, number?, string?]>();
    expectTypeOf(repeatText).returns.toEqualTypeOf<string>();
  });
});

describe("formatPrice", () => {
  test("省略すると円、税抜き", () => {
    expect(formatPrice(1000)).toBe("1,000円");
  });

  test("通貨と税込を指定できる", () => {
    expect(formatPrice(1000, "円", true)).toBe("1,100円");
    expect(formatPrice(999, "ドル", true)).toBe("1,098ドル");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(formatPrice).parameters.toEqualTypeOf<[number, string?, boolean?]>();
    expectTypeOf(formatPrice).returns.toEqualTypeOf<string>();
  });
});
