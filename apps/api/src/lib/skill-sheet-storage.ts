/**
 * スキルシート R2 キー規約とアップロード検証 (Issue #203)。
 */

import { ApiError } from "./authz.js";

export const SKILL_SHEET_ALLOWED_EXTENSIONS = ["pdf", "xlsx"] as const;
export type SkillSheetExtension = (typeof SKILL_SHEET_ALLOWED_EXTENSIONS)[number];

/** PDF / xlsx 各 ~10MB 上限。 */
export const SKILL_SHEET_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SKILL_SHEET_KEY_PATTERN = /^skill-sheets\/[^/]+\/[^/]+\/[^/]+\.(pdf|xlsx)$/;

export function buildSkillSheetR2Key(
  tenantId: string,
  profileId: string,
  id: string,
  ext: SkillSheetExtension,
): string {
  return `skill-sheets/${tenantId}/${profileId}/${id}.${ext}`;
}

export function assertSkillSheetR2Key(key: string): void {
  if (key.startsWith("tenant/")) {
    throw new ApiError("スキルシートの R2 キー形式が不正です", 400);
  }
  if (!SKILL_SHEET_KEY_PATTERN.test(key)) {
    throw new ApiError("スキルシートの R2 キー形式が不正です", 400);
  }
}

function extensionFromFilename(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return null;
  return filename.slice(dot + 1).toLowerCase();
}

export function assertSkillSheetUploadFormat(
  filename: string,
  _mimeType: string,
  byteLength: number,
): SkillSheetExtension {
  if (byteLength > SKILL_SHEET_MAX_UPLOAD_BYTES) {
    throw new ApiError(
      `ファイルサイズが上限 (${SKILL_SHEET_MAX_UPLOAD_BYTES} バイト) を超えています`,
      400,
    );
  }

  const ext = extensionFromFilename(filename);
  if (!ext || !SKILL_SHEET_ALLOWED_EXTENSIONS.includes(ext as SkillSheetExtension)) {
    throw new ApiError(
      "対応していないファイル形式です。PDF または xlsx ファイルをアップロードしてください",
      400,
    );
  }

  return ext as SkillSheetExtension;
}
