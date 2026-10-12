import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { libraryRoute } from "./library.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import type { LibraryShelfResponse } from "@stella/shared/library/types";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "library-metadata-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('ses','SES',1,1);
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('other-tenant','Other',1,1);
    INSERT INTO profiles (id, tenant_id, role, display_name, disabled, created_at) VALUES
      ('owner','ses','student','Owner',0,1),
      ('other','ses','student','Other',0,1),
      ('outsider','other-tenant','student','Outsider',0,1),
      ('instructor','ses','instructor','Instructor',0,1),
      ('admin','ses','admin','Admin',0,1),
      ('platform-admin','ses','platform_admin','Platform admin',0,1),
      ('sales','ses','sales','Sales',0,1),
      ('disabled','ses','student','Disabled',1,1);
    INSERT INTO library_books (id, tenant_id, owner_id, title, author, kind, created_at, updated_at)
      VALUES ('book','ses','owner','Old title','Old author','in_house',1,1);
  `);
  env = { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env;
  app = mountTestApp(env, libraryRoute).app;
});
afterEach(() => db.sqlite.close());

const patch = async (body: unknown) =>
  request(app, env, "/api/library/books/book", {
    token: await signAccessToken(SECRET, "owner", "owner@example.test"),
    method: "PATCH",
    body: JSON.stringify(body),
  });
const metadata = () =>
  db.sqlite.prepare("SELECT title,author,kind FROM library_books WHERE id = 'book'").get();

describe("personal book metadata", () => {
  it("preserves edits to different fields when both requests read the same old row", async () => {
    let reads = 0;
    let release: () => void = () => undefined;
    const bothRead = new Promise<void>((resolve) => {
      release = resolve;
    });
    const wrap = (statement: D1PreparedStatement, sql: string): D1PreparedStatement =>
      new Proxy(statement, {
        get(target, property, receiver) {
          if (property === "bind")
            return (...params: unknown[]) => wrap(target.bind(...params), sql);
          if (property === "first" && sql.startsWith("SELECT * FROM library_books"))
            return async () => {
              const row = await target.first();
              if (reads < 2) {
                reads++;
                if (reads === 2) release();
                await bothRead;
              }
              return row;
            };
          return Reflect.get(target, property, receiver);
        },
      });
    env.DB = new Proxy(db.binding, {
      get(target, property, receiver) {
        if (property === "prepare") return (sql: string) => wrap(target.prepare(sql), sql);
        return Reflect.get(target, property, receiver);
      },
    });
    const responses = await Promise.all([
      patch({ title: "New title" }),
      patch({ author: "New author" }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(metadata()).toEqual({ title: "New title", author: "New author", kind: "in_house" });
  });
  it("clears an explicitly null author without changing omitted fields", async () => {
    expect((await patch({ author: null })).status).toBe(200);
    expect(metadata()).toEqual({ title: "Old title", author: null, kind: "in_house" });
  });
});

const call = async (path: string, user = "owner", method = "GET", body?: unknown) =>
  request(app, env, `/api/library/${path}`, {
    token: await signAccessToken(SECRET, user, `${user}@example.test`),
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe("private bookshelf access", () => {
  it("requires an active STELLA profile", async () => {
    expect((await request(app, env, "/api/library/mine", { token: "invalid" })).status).toBe(401);
    expect((await call("mine", "missing")).status).toBe(403);
    expect((await call("mine", "disabled")).status).toBe(403);
    expect((await request(app, env, "/api/library/mine")).status).toBe(401);
  });
  it("selects ownership on the server and hides the book from every other caller", async () => {
    for (const extra of [
      { ownerId: "other" },
      { tenantId: "other-tenant" },
      { visibility: "company" },
    ])
      expect((await call("books", "owner", "POST", { title: "wrong", ...extra })).status).toBe(400);
    const created = await call("books", "owner", "POST", { title: "Personal book" });
    expect(created.status).toBe(201);
    const id = (await json<{ book: { id: string } }>(created)).book.id;
    for (const user of ["other", "outsider", "instructor", "admin", "platform-admin", "sales"]) {
      expect((await call(`books/${id}`, user)).status).toBe(404);
      expect((await call(`books/${id}`, user, "PATCH", { title: "stolen" })).status).toBe(404);
      expect((await call(`shelf/${id}`, user, "PUT", { favorite: true })).status).toBe(404);
      expect((await call(`books/${id}`, user, "DELETE")).status).toBe(404);
      expect((await json<LibraryShelfResponse>(await call("mine", user))).total).toBe(0);
    }
    expect(
      (
        await call(`shelf/${id}`, "owner", "PUT", {
          readingStatus: "reading",
          favorite: true,
          tags: [" SQL ", "SQL"],
        })
      ).status,
    ).toBe(200);
    const shelf = await json<LibraryShelfResponse>(await call("mine"));
    expect(shelf.entries.find((entry) => entry.book.id === id)).toMatchObject({
      readingStatus: "reading",
      favorite: true,
      tags: ["SQL"],
    });
    expect(JSON.stringify(shelf)).not.toMatch(/owner_id|tenant_id/);
    expect((await call(`shelf/${id}`, "owner", "PUT", { readingStatus: "bad" })).status).toBe(400);
    expect((await call("mine?limit=0")).status).toBe(400);
    expect((await call(`shelf/${id}`, "owner", "DELETE")).status).toBe(200);
    expect((await call(`books/${id}`)).status).toBe(200);
    expect((await call(`shelf/${id}`, "owner", "PUT", { favorite: false })).status).toBe(200);
    expect((await call(`books/${id}`, "owner", "DELETE")).status).toBe(202);
    expect((await call(`books/${id}`)).status).toBe(404);
    expect(
      db.sqlite
        .prepare("SELECT count(*) AS count FROM library_shelf_entries WHERE book_id = ?")
        .get(id),
    ).toEqual({ count: 0 });
    expect(
      db.sqlite
        .prepare("SELECT count(*) AS count FROM library_r2_deletions WHERE book_id = ?")
        .get(id),
    ).toEqual({ count: 1 });
  });
  it("lets each staff role own a private shelf", async () => {
    for (const user of ["instructor", "admin", "platform-admin", "sales"]) {
      expect((await call("books", user, "POST", { title: `${user}'s book` })).status).toBe(201);
      expect((await json<LibraryShelfResponse>(await call("mine", user))).total).toBe(1);
    }
  });
});
