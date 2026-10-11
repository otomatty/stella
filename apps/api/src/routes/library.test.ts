import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { libraryRoute } from "./library.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "library-metadata-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('ses','SES',1,1);
    INSERT INTO profiles (id, tenant_id, role, display_name, created_at) VALUES ('owner','ses','student','Owner',1);
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
