import { describe, expect, expectTypeOf, test } from "vitest";
import { COLOR_HEX, type Color, isColor, toHex } from "../src/e02-enum-to-union";

describe("Color", () => {
  test("ユニオン型になっている", () => {
    expectTypeOf<Color>().toEqualTypeOf<"red" | "green" | "blue">();
  });

  test("COLOR_HEX は as const のオブジェクト", () => {
    expectTypeOf<typeof COLOR_HEX>().toEqualTypeOf<{
      readonly red: "#ff0000";
      readonly green: "#00ff00";
      readonly blue: "#0000ff";
    }>();
  });
});

describe("toHex", () => {
  test("文字列をそのまま渡せる", () => {
    expect(toHex("red")).toBe("#ff0000");
    expect(toHex("blue")).toBe("#0000ff");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(toHex).parameters.toEqualTypeOf<[Color]>();
    expectTypeOf(toHex).returns.toEqualTypeOf<string>();
  });
});

describe("isColor", () => {
  test("色の名前なら true", () => {
    expect(isColor("green")).toBe(true);
    expect(isColor("yellow")).toBe(false);
    expect(isColor("Red")).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(isColor).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(isColor).returns.toEqualTypeOf<boolean>();
  });
});
