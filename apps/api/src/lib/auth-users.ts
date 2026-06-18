/**
 * auth_users テーブルの upsert / 招待登録。
 */

import { eq } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { authUsers } from "../db/schema.js";

export async function findOrCreateUserByEmail(
  db: Db,
  email: string,
): Promise<{ id: string; email: string }> {
  const normalized = email.trim().toLowerCase();
  const existing = (
    await db.select().from(authUsers).where(eq(authUsers.email, normalized)).limit(1)
  )[0];
  if (existing) {
    return { id: existing.id, email: existing.email };
  }

  const id = crypto.randomUUID();
  await db.insert(authUsers).values({ id, email: normalized });
  return { id, email: normalized };
}

/** 招待時: プロフィール ID と同じ auth_users 行を作成する (Google ログイン待ち)。 */
export async function registerInvitedUser(db: Db, userId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await db.insert(authUsers).values({ id: userId, email: normalized });
}
