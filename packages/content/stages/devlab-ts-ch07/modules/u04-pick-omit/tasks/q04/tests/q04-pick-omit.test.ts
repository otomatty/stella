import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type NewUser,
  type PublicUser,
  type User,
  type UserSummary,
  type UserUpdate,
  applyUpdate,
  createUser,
  toPublic,
  toSummary,
} from "../src/q04-pick-omit";

const createdAt = new Date("2026-12-01T09:00:00Z");
const user = (): User => ({
  id: 1,
  name: "山田",
  email: "y@example.com",
  password: "secret",
  createdAt,
});

describe("型", () => {
  test("PublicUser と UserSummary", () => {
    expectTypeOf<PublicUser>().toEqualTypeOf<Omit<User, "password">>();
    expectTypeOf<UserSummary>().toEqualTypeOf<Pick<User, "id" | "name">>();
  });

  test("NewUser と UserUpdate", () => {
    expectTypeOf<NewUser>().toEqualTypeOf<{ name: string; email: string; password: string }>();
    expectTypeOf<UserUpdate>().toEqualTypeOf<{ name?: string; email?: string }>();
  });
});

describe("toPublic", () => {
  test("password を含めない", () => {
    const result = toPublic(user());
    expect(result).toEqual({ id: 1, name: "山田", email: "y@example.com", createdAt });
    expect("password" in result).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(toPublic).parameters.toEqualTypeOf<[User]>();
    expectTypeOf(toPublic).returns.toEqualTypeOf<PublicUser>();
  });
});

describe("toSummary", () => {
  test("id と name だけ", () => {
    expect(toSummary(user())).toStrictEqual({ id: 1, name: "山田" });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(toSummary).parameters.toEqualTypeOf<[User]>();
    expectTypeOf(toSummary).returns.toEqualTypeOf<UserSummary>();
  });
});

describe("createUser", () => {
  test("id と createdAt を足す", () => {
    expect(
      createUser({ name: "山田", email: "y@example.com", password: "secret" }, 1, createdAt),
    ).toEqual(user());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(createUser).parameters.toEqualTypeOf<[NewUser, number, Date]>();
    expectTypeOf(createUser).returns.toEqualTypeOf<User>();
  });
});

describe("applyUpdate", () => {
  test("name と email を上書きする", () => {
    expect(applyUpdate(user(), { email: "new@example.com" })).toEqual({
      ...user(),
      email: "new@example.com",
    });
    expect(applyUpdate(user(), {})).toEqual(user());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(applyUpdate).parameters.toEqualTypeOf<[User, UserUpdate]>();
    expectTypeOf(applyUpdate).returns.toEqualTypeOf<User>();
  });
});
