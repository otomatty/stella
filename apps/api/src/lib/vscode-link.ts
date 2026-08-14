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
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const VSCODE_LINK_TTL_MS = 5 * 60 * 1000;

export const INVALID_VSCODE_LINK = "接続コードが無効です";

export type VscodeLinkRow = {
  id: string;
  userId: string;
  usedAt: Date | null;
  expiresAt: Date;
};

export async function redeemVscodeLink(args: {
  row: VscodeLinkRow | undefined;
  now: Date;
  resolveEmail: (userId: string) => Promise<string | null>;
  consume: (id: string) => Promise<boolean>;
  signToken: (userId: string, email: string) => Promise<string>;
}): Promise<{ access_token: string; userId: string }> {
  const { row, now, resolveEmail, consume, signToken } = args;
  if (!row || row.usedAt != null || row.expiresAt <= now) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  const email = await resolveEmail(row.userId);
  if (!email) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  const consumed = await consume(row.id);
  if (!consumed) {
    throw new ApiError(INVALID_VSCODE_LINK, 401);
  }

  return { access_token: await signToken(row.userId, email), userId: row.userId };
}
