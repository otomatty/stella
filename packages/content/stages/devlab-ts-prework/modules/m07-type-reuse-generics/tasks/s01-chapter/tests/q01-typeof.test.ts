import { describe, expect, expectTypeOf, test } from "vitest";
import { type Config, type Theme, DEFAULT_CONFIG, isTheme, mergeConfig } from "../src/q01-typeof";

describe("Config", () => {
  test("DEFAULT_CONFIG の型になっている", () => {
    expectTypeOf<Config>().toEqualTypeOf<{
      host: string;
      port: number;
      debug: boolean;
      features: { chat: boolean; video: boolean };
    }>();
  });
});

describe("mergeConfig", () => {
  test("DEFAULT_CONFIG に重ねる", () => {
    expect(mergeConfig({ port: 8080 })).toEqual({ ...DEFAULT_CONFIG, port: 8080 });
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig({ host: "example.com", debug: true })).toEqual({
      host: "example.com",
      port: 3000,
      debug: true,
      features: { chat: true, video: false },
    });
  });

  test("DEFAULT_CONFIG は変えない", () => {
    mergeConfig({ port: 1 });
    expect(DEFAULT_CONFIG.port).toBe(3000);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(mergeConfig).parameters.toEqualTypeOf<
      [{ host?: string; port?: number; debug?: boolean }]
    >();
    expectTypeOf(mergeConfig).returns.toEqualTypeOf<Config>();
  });
});

describe("Theme と isTheme", () => {
  test("Theme の型", () => {
    expectTypeOf<Theme>().toEqualTypeOf<"light" | "dark" | "system">();
  });

  test("Theme のどれかなら true", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("blue")).toBe(false);
  });

  test("型ガード関数になっている", () => {
    expectTypeOf(isTheme).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(isTheme).guards.toEqualTypeOf<Theme>();
  });
});
