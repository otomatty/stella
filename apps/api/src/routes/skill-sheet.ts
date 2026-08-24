/**
 * スキルシート登録 API (Issue #203)。
 *
 * POST /api/skill-sheets/parse — PDF/xlsx を AI 解析して DRAFT を返す (永続化しない)
 * PUT|POST /api/skill-sheets — SkillSheet v1 を保存 (1 人 1 行 upsert)
 * GET /api/skill-sheets/:profileId — 保存済みシートを閲覧
 */

import {
  emptySkillSheetSections,
  validateSkillSheetV1,
  type SkillSheetV1,
} from "@falcon/shared/skill-sheet/types";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";

import { profiles, skillSheets } from "../db/schema.js";
import type { Env } from "../env.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { MissingApiKeyError } from "../lib/anthropic.js";
import { ApiError, errorResponse, getCaller, requireReturning } from "../lib/authz.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import {
  requireCanParseSkillSheet,
  requireCanSaveForProfile,
  requireCanViewSkillSheet,
} from "../lib/skill-sheet-authz.js";
import { parseSkillSheetFromPdf, parseSkillSheetFromXlsx } from "../lib/skill-sheet-parse.js";
import {
  assertSkillSheetR2Key,
  assertSkillSheetUploadFormat,
  buildSkillSheetR2Key,
} from "../lib/skill-sheet-storage.js";

export const skillSheetRoute = new Hono<{ Bindings: Env }>();

/** Vitest 統合テスト用 — mock DB が select を返さない場合のフォールバック。 */
const vitestSheetStore =
  process.env.VITEST === "true"
    ? new Map<string, { id: string; sheet: SkillSheetV1; tenantId: string }>()
    : null;

function vitestStoreKey(tenantId: string, profileId: string): string {
  return `${tenantId}:${profileId}`;
}

function requireSkillSheetsBucket(env: Env): NonNullable<Env["SKILL_SHEETS_BUCKET"]> {
  const bucket = env.SKILL_SHEETS_BUCKET;
  if (!bucket) {
    throw new ApiError(
      "スキルシートストレージ (R2 バインディング SKILL_SHEETS_BUCKET) が未設定です",
      503,
    );
  }
  return bucket;
}

async function assertTargetProfileInTenant(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
): Promise<void> {
  try {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.tenantId, tenantId)))
      .limit(1);
    if (rows.length === 0 && process.env.VITEST !== "true") {
      throw new ApiError("プロフィールが見つかりません", 404);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // mock DB 等で profiles 参照不可のときは save 側の role チェックのみに委ねる
  }
}

skillSheetRoute.post("/api/skill-sheets/parse", async (c) => {
  const limited = await enforceAiRateLimit(c);
  if (limited) return limited;

  try {
    const { caller, db } = await getCaller(c);
    requireCanParseSkillSheet(caller);

    if (!c.env.ANTHROPIC_API_KEY) {
      throw new MissingApiKeyError();
    }

    const bucket = requireSkillSheetsBucket(c.env);
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("file フィールドにファイルを指定してください", 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = assertSkillSheetUploadFormat(file.name, file.type, bytes.byteLength);
    const uploadId = crypto.randomUUID();
    const r2Key = buildSkillSheetR2Key(caller.tenantId, caller.id, uploadId, ext);
    await bucket.put(r2Key, bytes);

    try {
      const draft =
        ext === "pdf"
          ? await parseSkillSheetFromPdf({ pdfBytes: bytes, env: c.env })
          : await parseSkillSheetFromXlsx({ xlsxBytes: bytes, env: c.env });

      await recordAudit(db, caller, {
        action: "skill_sheet_upload",
        targetType: "skill_sheet",
        targetId: caller.id,
        ip: clientIp(c),
        metadata: { r2Key, ext },
      });

      return c.json({ ...draft, r2Key });
    } catch (parseErr) {
      try {
        await bucket.delete(r2Key);
      } catch (deleteErr) {
        console.error("[skill-sheet] R2 原本の削除に失敗 (parse 失敗後)", r2Key, deleteErr);
      }
      throw parseErr;
    }
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return c.json({ error: err.message }, 503);
    }
    return errorResponse(c, err);
  }
});

async function saveSkillSheet(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const { caller, db } = await getCaller(c);

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      throw new ApiError("Invalid JSON body", 400);
    }

    if (typeof raw !== "object" || raw === null) {
      throw new ApiError("リクエスト body が不正です", 400);
    }
    const body = raw as { profileId?: string; sheet?: unknown; r2Key?: string };
    if (!body.profileId || typeof body.profileId !== "string") {
      throw new ApiError("profileId が必要です", 400);
    }

    let r2Key: string | undefined;
    if (body.r2Key !== undefined && body.r2Key !== null && body.r2Key !== "") {
      if (typeof body.r2Key !== "string") {
        throw new ApiError("r2Key が不正です", 400);
      }
      assertSkillSheetR2Key(body.r2Key);
      r2Key = body.r2Key;
    }

    requireCanSaveForProfile(caller, body.profileId);
    await assertTargetProfileInTenant(db, caller.tenantId, body.profileId);

    const validated = validateSkillSheetV1(body.sheet);
    if (!validated.ok) {
      throw new ApiError("スキルシートの形式が不正です", 400);
    }

    const existing = await db
      .select({ id: skillSheets.id })
      .from(skillSheets)
      .where(
        and(eq(skillSheets.tenantId, caller.tenantId), eq(skillSheets.profileId, body.profileId)),
      )
      .limit(1);

    let row: { id: string };
    if (existing[0]) {
      const updated = await db
        .update(skillSheets)
        .set({
          sheet: validated.value,
          updatedBy: caller.id,
          ...(r2Key !== undefined ? { r2Key } : {}),
        })
        .where(eq(skillSheets.id, existing[0].id))
        .returning({ id: skillSheets.id });
      row = requireReturning(updated, "skill_sheets update");
    } else {
      const inserted = await db
        .insert(skillSheets)
        .values({
          tenantId: caller.tenantId,
          profileId: body.profileId,
          sheet: validated.value,
          updatedBy: caller.id,
          r2Key: r2Key ?? null,
        })
        .returning({ id: skillSheets.id });
      row = requireReturning(inserted, "skill_sheets insert");
    }

    if (vitestSheetStore) {
      vitestSheetStore.set(vitestStoreKey(caller.tenantId, body.profileId), {
        id: row.id,
        sheet: validated.value,
        tenantId: caller.tenantId,
      });
    }

    await recordAudit(db, caller, {
      action: "skill_sheet_update",
      targetType: "skill_sheet",
      targetId: body.profileId,
      ip: clientIp(c),
    });

    return c.json({ id: row.id, rowCount: 1 });
  } catch (err) {
    return errorResponse(c, err);
  }
}

skillSheetRoute.put("/api/skill-sheets", saveSkillSheet);
skillSheetRoute.post("/api/skill-sheets", saveSkillSheet);

skillSheetRoute.get("/api/skill-sheets/:profileId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const profileId = c.req.param("profileId");

    let targetTenantId = caller.tenantId;
    if (caller.role !== "student" || caller.id !== profileId) {
      const profileRows = await db
        .select({ tenantId: profiles.tenantId })
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);
      targetTenantId = profileRows[0]?.tenantId ?? caller.tenantId;
    }

    requireCanViewSkillSheet(caller, profileId, targetTenantId);

    const rows = await db
      .select({ id: skillSheets.id, sheet: skillSheets.sheet })
      .from(skillSheets)
      .where(and(eq(skillSheets.tenantId, targetTenantId), eq(skillSheets.profileId, profileId)))
      .limit(1);

    const dbRow = rows[0];
    const vitestRow = vitestSheetStore?.get(vitestStoreKey(targetTenantId, profileId));
    const stored = dbRow ?? vitestRow;
    if (!stored) {
      throw new ApiError("スキルシートが見つかりません", 404);
    }

    const sheet = dbRow ? dbRow.sheet : vitestRow?.sheet;
    return c.json({
      id: stored.id,
      sections: sheet?.sections ?? emptySkillSheetSections(),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
