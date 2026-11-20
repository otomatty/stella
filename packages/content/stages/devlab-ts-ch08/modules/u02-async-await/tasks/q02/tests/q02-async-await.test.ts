import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type FetchUser,
  type User,
  getNamesText,
  getUserName,
  getUsersAtOnce,
  getUsersInOrder,
} from "../src/q02-async-await";

const names: Record<number, string> = { 1: "山田", 2: "佐藤", 3: "鈴木" };

// 取得の始まりと終わりを log に残す fetchUser
const createFetchUser = () => {
  const log: string[] = [];
  const fetchUser: FetchUser = async (id) => {
    log.push(`開始 ${id}`);
    await Promise.resolve();
    await Promise.resolve();
    const name = names[id];
    if (name === undefined) {
      throw new Error(`ユーザー ${id} はいません`);
    }
    log.push(`終了 ${id}`);
    return { id, name };
  };
  return { log, fetchUser };
};

describe("getUserName", () => {
  test("名前を返す", async () => {
    const { fetchUser } = createFetchUser();
    await expect(getUserName(fetchUser, 2)).resolves.toBe("佐藤");
    await expect(getUserName(fetchUser, 9)).rejects.toThrow("ユーザー 9 はいません");
  });

  test("型", () => {
    expectTypeOf(getUserName).parameters.toEqualTypeOf<[FetchUser, number]>();
    expectTypeOf(getUserName).returns.toEqualTypeOf<Promise<string>>();
  });
});

describe("getUsersInOrder", () => {
  test("1人ずつ順番に取得する", async () => {
    const { log, fetchUser } = createFetchUser();
    const users = await getUsersInOrder(fetchUser, [3, 1]);
    expect(users).toEqual([
      { id: 3, name: "鈴木" },
      { id: 1, name: "山田" },
    ]);
    expect(log).toEqual(["開始 3", "終了 3", "開始 1", "終了 1"]);
  });

  test("型", () => {
    expectTypeOf(getUsersInOrder).returns.toEqualTypeOf<Promise<User[]>>();
  });
});

describe("getUsersAtOnce", () => {
  test("一度に取得を始める", async () => {
    const { log, fetchUser } = createFetchUser();
    const users = await getUsersAtOnce(fetchUser, [3, 1, 2]);
    expect(users.map((u) => u.name)).toEqual(["鈴木", "山田", "佐藤"]);
    expect(log.slice(0, 3)).toEqual(["開始 3", "開始 1", "開始 2"]);
  });

  test("型", () => {
    expectTypeOf(getUsersAtOnce).returns.toEqualTypeOf<Promise<User[]>>();
  });
});

describe("getNamesText", () => {
  test("名前をつなぐ", async () => {
    const { fetchUser } = createFetchUser();
    await expect(getNamesText(fetchUser, [1, 2])).resolves.toBe("山田、佐藤");
    await expect(getNamesText(fetchUser, [])).resolves.toBe("");
  });

  test("型", () => {
    expectTypeOf(getNamesText).returns.toEqualTypeOf<Promise<string>>();
  });
});
