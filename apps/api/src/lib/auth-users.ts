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

  // 同じメールの未招待ログインが重なると、両方が「行なし」と読んで挿入する。
  // 一意制約で落ちると invite_required が 500 になるので、競合した側は先にできた行を読む。
  await db
    .insert(authUsers)
    .values({ id: crypto.randomUUID(), email: normalized })
    .onConflictDoNothing({ target: authUsers.email });
  const row = (
    await db.select().from(authUsers).where(eq(authUsers.email, normalized)).limit(1)
  )[0];
  if (!row) throw new Error("auth_users の作成に失敗しました");
  return { id: row.id, email: row.email };
}

/** 招待時: プロフィール ID と同じ auth_users 行を作成する (Google ログイン待ち)。 */
export async function registerInvitedUser(db: Db, userId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await db.insert(authUsers).values({ id: userId, email: normalized });
}

/**
 * 招待で使う auth_users.id を解決する。
 * login-before-invite の場合は既存 id を再利用し、なければ新規 UUID を返す。
 */
export async function resolveInviteAuthUserId(
  db: Db,
  email: string,
): Promise<{ userId: string; authExists: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = (
    await db.select().from(authUsers).where(eq(authUsers.email, normalized)).limit(1)
  )[0];
  if (existing) {
    return { userId: existing.id, authExists: true };
  }
  return { userId: crypto.randomUUID(), authExists: false };
}
