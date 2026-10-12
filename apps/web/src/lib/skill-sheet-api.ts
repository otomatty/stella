/**
 * スキルシート Web API クライアント (Issue #203 / #233)。
 */

import type { SkillSheetDraft, SkillSheetV1 } from "@stella/shared/skill-sheet/types";

import { authFetch, readApiError } from "./api-client";

const PARSE_PATH = "/api/skill-sheets/parse";
const SAVE_PATH = "/api/skill-sheets";
const viewPath = (profileId: string) => `/api/skill-sheets/${profileId}`;

/** PDF / xlsx を POST /api/skill-sheets/parse へ送り DRAFT を返す。 */
export async function parseSkillSheet(file: File): Promise<SkillSheetDraft> {
  const form = new FormData();
  form.append("file", file);

  const res = await authFetch(PARSE_PATH, { method: "POST", body: form });

  if (!res.ok) {
    throw new Error(await readApiError(res));
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

  const res = await authFetch(SAVE_PATH, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as { id: string; rowCount: number };
}

/** 保存済みスキルシートを GET /api/skill-sheets/:profileId から取得する。 */
export async function fetchSkillSheet(
  profileId: string,
): Promise<{ id: string; sections: SkillSheetV1["sections"] }> {
  const res = await authFetch(viewPath(profileId), { method: "GET" });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as { id: string; sections: SkillSheetV1["sections"] };
}
