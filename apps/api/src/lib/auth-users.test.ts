import { afterEach, describe, expect, it } from "vitest";

import { getDb } from "../db/client.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { findOrCreateUserByEmail } from "./auth-users.js";

const opened: ReturnType<typeof sqliteD1>[] = [];

function setup() {
  const raw = sqliteD1();
  opened.push(raw);
  return getDb({ DB: raw.binding } as Env);
}

afterEach(() => {
  for (const raw of opened) raw.sqlite.close();
  opened.length = 0;
});

describe("findOrCreateUserByEmail", () => {
  it("同じメールの同時作成でも片方を 500 にせず、同じ id を返す", async () => {
    const db = setup();
    const [a, b] = await Promise.all([
      findOrCreateUserByEmail(db, "New@Example.test"),
      findOrCreateUserByEmail(db, "new@example.test"),
    ]);
    expect(a.id).toBe(b.id);
    expect(a.email).toBe("new@example.test");
    expect(b.email).toBe("new@example.test");
  });
});
