// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type UserName,
  type UserContact,
  type SafeUser,
  type NewUser,
  type ArticleSummary,
  type ArticleDraft,
  type User,
  toContact,
  toSafeUser,
  type Article,
  toSummary,
  createUser,
  publish,
  summaries,
  safeUsers,
  type UserPatch,
  patchUser,
  type AuthorInfo,
  authorInfo,
  findContact,
  type Credentials,
  login,
  type PublicArticle,
  toPublicArticle,
  type Teaser,
  toTeaser,
  type UserRow,
  toRows,
} from "../src/q04-pick-omit.drill";

test("問1 UserName", () => {
  expectTypeOf<UserName>().toEqualTypeOf<{ name: string }>();
});

test("問2 UserContact", () => {
  expectTypeOf<UserContact>().toEqualTypeOf<{ name: string; email: string }>();
});

test("問3 SafeUser", () => {
  expectTypeOf<SafeUser>().toEqualTypeOf<{
    id: number;
    name: string;
    email: string;
    age: number;
  }>();
});

test("問4 NewUser", () => {
  expectTypeOf<NewUser>().toEqualTypeOf<{
    name: string;
    email: string;
    password: string;
    age: number;
  }>();
});

test("問5 ArticleSummary", () => {
  expectTypeOf<ArticleSummary>().toEqualTypeOf<{ id: number; title: string }>();
});

test("問6 ArticleDraft", () => {
  expectTypeOf<ArticleDraft>().toEqualTypeOf<{ title: string; body: string; author: string }>();
});

test("問7 toContact", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 };
  expect(toContact(user)).toStrictEqual({ name: "山田", email: "y@example.com" });
  expectTypeOf(toContact).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(toContact).returns.toEqualTypeOf<Pick<User, "name" | "email">>();
});

test("問8 toSafeUser", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 };
  expect(toSafeUser(user)).toStrictEqual({ id: 1, name: "山田", email: "y@example.com", age: 30 });
  expectTypeOf(toSafeUser).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(toSafeUser).returns.toEqualTypeOf<Omit<User, "password">>();
});

test("問9 toSummary", () => {
  const article: Article = {
    id: 1,
    title: "はじめまして",
    body: "本文",
    author: "山田",
    publishedAt: new Date(0),
  };
  expect(toSummary(article)).toStrictEqual({ id: 1, title: "はじめまして" });
  expectTypeOf(toSummary).parameters.toEqualTypeOf<[Article]>();
  expectTypeOf(toSummary).returns.toEqualTypeOf<Pick<Article, "id" | "title">>();
});

test("問10 createUser", () => {
  expect(createUser({ name: "山田", email: "y@example.com", password: "x", age: 30 }, 7)).toEqual({
    id: 7,
    name: "山田",
    email: "y@example.com",
    password: "x",
    age: 30,
  });
  expectTypeOf(createUser).parameters.toEqualTypeOf<[Omit<User, "id">, number]>();
  expectTypeOf(createUser).returns.toEqualTypeOf<User>();
});

test("問11 publish", () => {
  const at = new Date("2026-12-01T09:00:00Z");
  expect(publish({ title: "t", body: "b", author: "a" }, 1, at)).toEqual({
    id: 1,
    title: "t",
    body: "b",
    author: "a",
    publishedAt: at,
  });
  expectTypeOf(publish).parameters.toEqualTypeOf<
    [Omit<Article, "id" | "publishedAt">, number, Date]
  >();
  expectTypeOf(publish).returns.toEqualTypeOf<Article>();
});

test("問12 summaries", () => {
  const articles: Article[] = [
    { id: 1, title: "a", body: "x", author: "山田", publishedAt: new Date(0) },
    { id: 2, title: "b", body: "y", author: "佐藤", publishedAt: new Date(0) },
  ];
  expect(summaries(articles)).toStrictEqual([
    { id: 1, title: "a" },
    { id: 2, title: "b" },
  ]);
  expectTypeOf(summaries).parameters.toEqualTypeOf<[readonly Article[]]>();
  expectTypeOf(summaries).returns.toEqualTypeOf<Pick<Article, "id" | "title">[]>();
});

test("問13 safeUsers", () => {
  const users: User[] = [{ id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 }];
  expect(safeUsers(users)).toStrictEqual([
    { id: 1, name: "山田", email: "y@example.com", age: 30 },
  ]);
  expectTypeOf(safeUsers).parameters.toEqualTypeOf<[readonly User[]]>();
  expectTypeOf(safeUsers).returns.toEqualTypeOf<Omit<User, "password">[]>();
});

test("問14 patchUser", () => {
  expectTypeOf<UserPatch>().toEqualTypeOf<{ name?: string; email?: string; age?: number }>();
  const user: User = { id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 };
  expect(patchUser(user, { age: 31 })).toEqual({ ...user, age: 31 });
  expectTypeOf(patchUser).parameters.toEqualTypeOf<[User, UserPatch]>();
  expectTypeOf(patchUser).returns.toEqualTypeOf<User>();
});

test("問15 authorInfo", () => {
  const articles: Article[] = [
    { id: 1, title: "a", body: "x", author: "山田", publishedAt: new Date(0) },
    { id: 2, title: "b", body: "y", author: "佐藤", publishedAt: new Date(0) },
    { id: 3, title: "c", body: "z", author: "山田", publishedAt: new Date(0) },
  ];
  expect(authorInfo(articles, "山田")).toEqual({ author: "山田", articleCount: 2 });
  expectTypeOf<AuthorInfo>().toEqualTypeOf<{ author: string } & { articleCount: number }>();
  expectTypeOf(authorInfo).parameters.toEqualTypeOf<[readonly Article[], string]>();
  expectTypeOf(authorInfo).returns.toEqualTypeOf<AuthorInfo>();
});

test("問16 findContact", () => {
  const users: User[] = [{ id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 }];
  expect(findContact(users, 1)).toStrictEqual({ name: "山田", email: "y@example.com" });
  expect(findContact(users, 2)).toBeUndefined();
  expectTypeOf(findContact).parameters.toEqualTypeOf<[readonly User[], number]>();
  expectTypeOf(findContact).returns.toEqualTypeOf<Pick<User, "name" | "email"> | undefined>();
});

test("問17 login", () => {
  const users: User[] = [{ id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 }];
  expect(login(users, { email: "y@example.com", password: "x" })).toStrictEqual({
    id: 1,
    name: "山田",
    email: "y@example.com",
    age: 30,
  });
  expect(login(users, { email: "y@example.com", password: "ng" })).toBeUndefined();
  expectTypeOf<Credentials>().toEqualTypeOf<{ email: string; password: string }>();
  expectTypeOf(login).parameters.toEqualTypeOf<[readonly User[], Credentials]>();
  expectTypeOf(login).returns.toEqualTypeOf<Omit<User, "password"> | undefined>();
});

test("問18 toPublicArticle", () => {
  const at = new Date(0);
  expect(
    toPublicArticle({ id: 1, title: "a", body: "x", author: "山田", publishedAt: at }),
  ).toStrictEqual({
    id: 1,
    title: "a",
    author: "山田",
    publishedAt: at,
  });
  expectTypeOf(toPublicArticle).parameters.toEqualTypeOf<[Article]>();
  expectTypeOf(toPublicArticle).returns.toEqualTypeOf<PublicArticle>();
});

test("問19 toTeaser", () => {
  const base: Article = {
    id: 1,
    title: "入門",
    body: "TypeScriptを始めよう",
    author: "山田",
    publishedAt: new Date(0),
  };
  expect(toTeaser(base)).toStrictEqual({ title: "入門", excerpt: "TypeScript…" });
  expect(toTeaser({ ...base, body: "短い" }).excerpt).toBe("短い");
  expectTypeOf(toTeaser).parameters.toEqualTypeOf<[Article]>();
  expectTypeOf(toTeaser).returns.toEqualTypeOf<Teaser>();
});

test("問20 toRows", () => {
  const users: User[] = [
    { id: 2, name: "佐藤", email: "s@example.com", password: "x", age: 41 },
    { id: 1, name: "山田", email: "y@example.com", password: "y", age: 30 },
  ];
  expect(toRows(users)).toStrictEqual([
    { id: 1, name: "山田", age: 30 },
    { id: 2, name: "佐藤", age: 41 },
  ]);
  expectTypeOf(toRows).parameters.toEqualTypeOf<[readonly User[]]>();
  expectTypeOf(toRows).returns.toEqualTypeOf<UserRow[]>();
});
