import { describe, expect, expectTypeOf, test } from "vitest";
import { type Config, addOrigin, setMaxUsers } from "../src/e01-nested-readonly";

const base = (): Config => ({
  name: "agora",
  allowedOrigins: ["https://example.com"],
  limits: { maxUsers: 50, maxRooms: 5 },
});

describe("Config", () => {
  test("Config の型", () => {
    expectTypeOf<Config>().toEqualTypeOf<{
      readonly name: string;
      readonly allowedOrigins: readonly string[];
      readonly limits: { readonly maxUsers: number; readonly maxRooms: number };
    }>();
  });

  test("中まで書き換えられない", () => {
    const config = base();
    // @ts-expect-error 読み取り専用の配列は、書き換えられる配列に入れられない
    const origins: string[] = config.allowedOrigins;
    expect(origins).toHaveLength(1);
    // @ts-expect-error limits の中のプロパティも読み取り専用
    config.limits.maxUsers = 999;
  });
});

describe("addOrigin", () => {
  test("origin を足した新しい Config を返し、元は変えない", () => {
    const config = base();
    expect(addOrigin(config, "https://example.org").allowedOrigins).toEqual([
      "https://example.com",
      "https://example.org",
    ]);
    expect(config).toEqual(base());
  });

  test("すでに含まれていれば、そのまま返す", () => {
    const config = base();
    expect(addOrigin(config, "https://example.com")).toBe(config);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(addOrigin).parameters.toEqualTypeOf<[Config, string]>();
    expectTypeOf(addOrigin).returns.toEqualTypeOf<Config>();
  });
});

describe("setMaxUsers", () => {
  test("limits.maxUsers だけを変えた新しい Config を返し、元は変えない", () => {
    const config = base();
    const updated = setMaxUsers(config, 100);
    expect(updated).toEqual({ ...base(), limits: { maxUsers: 100, maxRooms: 5 } });
    expect(updated.limits).not.toBe(config.limits);
    expect(config).toEqual(base());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(setMaxUsers).parameters.toEqualTypeOf<[Config, number]>();
    expectTypeOf(setMaxUsers).returns.toEqualTypeOf<Config>();
  });
});
