import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type ActiveStatus,
  type ClickEvent,
  type FetchedUser,
  type Name,
  type Session,
  isActive,
} from "../src/e02-utility-types";

describe("型", () => {
  test("ActiveStatus と ClickEvent", () => {
    expectTypeOf<ActiveStatus>().toEqualTypeOf<"draft" | "published">();
    expectTypeOf<ClickEvent>().toEqualTypeOf<{ type: "click"; x: number; y: number }>();
  });

  test("Name、Session、FetchedUser", () => {
    expectTypeOf<Name>().toEqualTypeOf<string>();
    expectTypeOf<Session>().toEqualTypeOf<{ userId: number; token: string; expiresAt: number }>();
    expectTypeOf<FetchedUser>().toEqualTypeOf<{ id: number; name: string }>();
  });
});

describe("isActive", () => {
  test("draft と published なら true", () => {
    expect(isActive("draft")).toBe(true);
    expect(isActive("published")).toBe(true);
    expect(isActive("archived")).toBe(false);
  });

  test("型ガード関数になっている", () => {
    expectTypeOf(isActive).guards.toEqualTypeOf<ActiveStatus>();
  });
});
