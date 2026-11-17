import { describe, expect, expectTypeOf, test } from "vitest";
import { type RouteName, ROUTES, pathOf, protectedPaths } from "../src/e01-satisfies";

describe("ROUTES", () => {
  test("キー名が型に残る", () => {
    expectTypeOf<RouteName>().toEqualTypeOf<"home" | "settings" | "admin">();
  });

  test("中身は変わらない", () => {
    expect(ROUTES.home).toEqual({ path: "/", auth: false });
  });
});

describe("pathOf", () => {
  test("画面の path を返す", () => {
    expect(pathOf("home")).toBe("/");
    expect(pathOf("admin")).toBe("/admin");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(pathOf).parameters.toEqualTypeOf<[RouteName]>();
    expectTypeOf(pathOf).returns.toEqualTypeOf<string>();
    // @ts-expect-error 存在しない画面の名前は渡せない
    expectTypeOf(pathOf).toBeCallableWith("profile");
  });
});

describe("protectedPaths", () => {
  test("auth が true の path を返す", () => {
    expect(protectedPaths()).toEqual(["/settings", "/admin"]);
  });

  test("戻り値の型", () => {
    expectTypeOf(protectedPaths).returns.toEqualTypeOf<string[]>();
  });
});
