/**
 * スキルシート Web API クライアント (Issue #203 / #233)。
 */

import type { SkillSheetDraft, SkillSheetV1 } from "@falcon/shared/skill-sheet/types";

function serverUrl(): string {
  return (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
}

const PARSE_PATH = "/api/skill-sheets/parse";
const SAVE_PATH = "/api/skill-sheets";
const viewPath = (profileId: string) => `/api/skill-sheets/${profileId}`;

async function authHeaders(): Promise<Record<string, string>> {
  const { getAccessToken } = await import("./auth-client.js");
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readErrorMessage(res: Response): Promise<string> {
  let message = `サーバエラー (${res.status})`;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: string };
      message = data.error ?? `${message}: ${text}`;
    } catch {
      message = `${message}: ${text}`;
    }
  }
  return message;
}

/** PDF / xlsx を POST /api/skill-sheets/parse へ送り DRAFT を返す。 */
export async function parseSkillSheet(file: File): Promise<SkillSheetDraft> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${serverUrl()}${PARSE_PATH}`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as SkillSheetDraft;
}

/** SkillSheetV1 を PUT /api/skill-sheets へ保存する。 */
export async function saveSkillSheet(
  profileId: string,
  sheet: SkillSheetV1,
  r2Key?: string,
): Promise<{ id: string; rowCount: number }> {
  const body: { profileId: string; sheet: SkillSheetV1; r2Key?: string } = {
    profileId,
    sheet,
  };
  if (r2Key) body.r2Key = r2Key;

  const res = await fetch(`${serverUrl()}${SAVE_PATH}`, {
    method: "PUT",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as { id: string; rowCount: number };
}

/** 保存済みスキルシートを GET /api/skill-sheets/:profileId から取得する。 */
export async function fetchSkillSheet(
  profileId: string,
): Promise<{ id: string; sections: SkillSheetV1["sections"] }> {
  const res = await fetch(`${serverUrl()}${viewPath(profileId)}`, {
    method: "GET",
    headers: await authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as { id: string; sections: SkillSheetV1["sections"] };
}
