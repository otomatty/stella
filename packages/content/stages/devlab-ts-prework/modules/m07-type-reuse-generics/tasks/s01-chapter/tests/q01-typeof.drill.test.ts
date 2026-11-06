// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type DefaultUser,
  type Point,
  type Settings,
  type Notifications,
  type Color,
  type Level,
  type RoleLabels,
  type Endpoint,
  type Version,
  type MaxSize,
  type Tag,
  type Item,
  type ClickHandler,
  DEFAULT_USER,
  cloneUser,
  movePoint,
  SETTINGS,
  withFontSize,
  isColor,
  nextLevel,
  roleLabel,
  endpointOf,
} from "../src/q01-typeof.drill";

test("問1 DefaultUser", () => {
  expectTypeOf<DefaultUser>().toEqualTypeOf<{ name: string; age: number; admin: boolean }>();
});

test("問2 Point", () => {
  expectTypeOf<Point>().toEqualTypeOf<{ x: number; y: number }>();
});

test("問3 Settings", () => {
  expectTypeOf<Settings>().toEqualTypeOf<{
    theme: string;
    fontSize: number;
    notifications: { email: boolean; push: boolean };
  }>();
});

test("問4 Notifications", () => {
  expectTypeOf<Notifications>().toEqualTypeOf<{ email: boolean; push: boolean }>();
});

test("問5 Color", () => {
  expectTypeOf<Color>().toEqualTypeOf<"red" | "green" | "blue">();
});

test("問6 Level", () => {
  expectTypeOf<Level>().toEqualTypeOf<1 | 2 | 3>();
});

test("問7 RoleLabels", () => {
  expectTypeOf<RoleLabels>().toEqualTypeOf<{ readonly admin: "管理者"; readonly member: "一般" }>();
});

test("問8 Endpoint", () => {
  expectTypeOf<Endpoint>().toEqualTypeOf<"/api/users" | "/api/rooms">();
});

test("問9 Version", () => {
  expectTypeOf<Version>().toEqualTypeOf<"1.2.3">();
});

test("問10 MaxSize", () => {
  expectTypeOf<MaxSize>().toEqualTypeOf<100>();
});

test("問11 Tag", () => {
  expectTypeOf<Tag>().toEqualTypeOf<string>();
});

test("問12 Item", () => {
  expectTypeOf<Item>().toEqualTypeOf<{ name: string; price: number; createdAt: number }>();
});

test("問13 ClickHandler", () => {
  expectTypeOf<ClickHandler>().toEqualTypeOf<(x: number, y: number) => string>();
});

test("問14 cloneUser", () => {
  const copied = cloneUser();
  expect(copied).toEqual(DEFAULT_USER);
  expect(copied).not.toBe(DEFAULT_USER);
  expectTypeOf(cloneUser).parameters.toEqualTypeOf<[]>();
  expectTypeOf(cloneUser).returns.toEqualTypeOf<{ name: string; age: number; admin: boolean }>();
});

test("問15 movePoint", () => {
  expect(movePoint({ x: 1, y: 2 }, 3, 4)).toEqual({ x: 4, y: 6 });
  expectTypeOf(movePoint).parameters.toEqualTypeOf<[{ x: number; y: number }, number, number]>();
  expectTypeOf(movePoint).returns.toEqualTypeOf<{ x: number; y: number }>();
});

test("問16 withFontSize", () => {
  expect(withFontSize(SETTINGS, 18)).toEqual({ ...SETTINGS, fontSize: 18 });
  expect(SETTINGS.fontSize).toBe(14);
  expectTypeOf(withFontSize).parameters.toEqualTypeOf<
    [{ theme: string; fontSize: number; notifications: { email: boolean; push: boolean } }, number]
  >();
  expectTypeOf(withFontSize).returns.toEqualTypeOf<{
    theme: string;
    fontSize: number;
    notifications: { email: boolean; push: boolean };
  }>();
});

test("問17 isColor", () => {
  expect(isColor("red")).toBe(true);
  expect(isColor("pink")).toBe(false);
  expectTypeOf(isColor).guards.toEqualTypeOf<"red" | "green" | "blue">();
});

test("問18 nextLevel", () => {
  expect(nextLevel(1)).toBe(2);
  expect(nextLevel(3)).toBe(3);
  expectTypeOf(nextLevel).parameters.toEqualTypeOf<[1 | 2 | 3]>();
  expectTypeOf(nextLevel).returns.toEqualTypeOf<1 | 2 | 3>();
});

test("問19 roleLabel", () => {
  expect(roleLabel("admin")).toBe("管理者");
  expect(roleLabel("member")).toBe("一般");
  expectTypeOf(roleLabel).parameters.toEqualTypeOf<["admin" | "member"]>();
  expectTypeOf(roleLabel).returns.toEqualTypeOf<string>();
});

test("問20 endpointOf", () => {
  expect(endpointOf("rooms")).toBe("/api/rooms");
  expectTypeOf(endpointOf).parameters.toEqualTypeOf<["users" | "rooms"]>();
  expectTypeOf(endpointOf).returns.toEqualTypeOf<string>();
});
