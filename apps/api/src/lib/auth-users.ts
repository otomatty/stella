/**
 * auth_users テーブルの upsert / 招待登録。
 */

import { eq } from "drizzle-orm";

import type { Db } from "../db/client.js";
import type { InviteUserInput } from "@stella/shared/admin/types";
import { authUsers, profiles } from "../db/schema.js";

/** Better Auth の image は本人も編集できる。アプリには Google 配信の画像だけを取り込む。 */
export function googleAvatarUrl(value: string | null | undefined): string | null {
  const image = value?.trim();
  return image && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(image) ? image : null;
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
export async function resolveInviteAuthUserId(db: Db, email: string) {
  const normalized = email.trim().toLowerCase();
  const existing = (
    await db
      .select({ id: authUsers.id, image: authUsers.image })
      .from(authUsers)
      .where(eq(authUsers.email, normalized))
      .limit(1)
  )[0];
  if (existing) {
    return { userId: existing.id, authExists: true, avatarUrl: googleAvatarUrl(existing.image) };
  }
  return { userId: crypto.randomUUID(), authExists: false, avatarUrl: null };
}

/** 管理画面と連携 API の共通招待。招待メールは送らず Google ログインを待つ。 */
export async function inviteUser(db: Db, inv: InviteUserInput): Promise<string> {
  const { userId, authExists, avatarUrl } = await resolveInviteAuthUserId(db, inv.email);
  const profileInsert = db.insert(profiles).values({
    id: userId,
    role: inv.role,
    displayName: inv.displayName,
    initials: inv.displayName.slice(0, 2).toUpperCase(),
    avatarUrl,
    email: inv.email,
  });
  if (authExists) await profileInsert;
  else
    await db.batch([profileInsert, db.insert(authUsers).values({ id: userId, email: inv.email })]);
  return userId;
}
