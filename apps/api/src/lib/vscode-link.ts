import { ApiError } from "./authz.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createVscodeLinkCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function hashVscodeLinkCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code.trim().toUpperCase()),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const VSCODE_LINK_TTL_MS = 5 * 60 * 1000;

export const INVALID_VSCODE_LINK = "接続コードが無効です";

export type VscodeLinkRow = {
  id: string;
  userId: string;
  usedAt: Date | null;
  expiresAt: Date;
  /** 発行時に預かった Access のトークン (開発環境では null)。 */
  accessToken?: string | null;
};

/**
 * 接続コードを 1 回だけトークンに換える。期限切れ・使用済み・無効化済みの利用者・渡すトークンが
 * 無い (Access のトークンを預かっていない) ときは、どれも同じ 401 にする (コードの状態を探らせない)。
 */
export async function redeemVscodeLink(args: {
  row: VscodeLinkRow | undefined;
  now: Date;
  loadProfile: (userId: string) => Promise<{ email: string | null; disabled: boolean } | null>;
  consume: (id: string) => Promise<boolean>;
  issueToken: (row: VscodeLinkRow, email: string) => Promise<string | null>;
}): Promise<{ access_token: string; userId: string }> {
  const { row, now, loadProfile, consume, issueToken } = args;
  if (!row || row.usedAt != null || row.expiresAt <= now) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  const profile = await loadProfile(row.userId);
  if (!profile?.email || profile.disabled) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  const token = await issueToken(row, profile.email);
  if (!token) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  const consumed = await consume(row.id);
  if (!consumed) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  return { access_token: token, userId: row.userId };
}
