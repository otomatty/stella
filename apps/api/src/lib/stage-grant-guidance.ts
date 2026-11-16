import { eq, inArray } from "drizzle-orm";
import type {
  StageGrantGuidance,
  StageGrantGuidanceSummary,
} from "@stella/shared/stage-grants/types";
import type { Db } from "../db/client.js";
import { stageGrants } from "../db/schema.js";
import { ApiError } from "./authz.js";
import { chunk } from "./enrollment-bulk.js";

export const guidanceColumns = {
  source_name: stageGrants.sourceName,
  due_at: stageGrants.dueAt,
  message: stageGrants.message,
};

export function guidanceOf(row?: Partial<StageGrantGuidance>): StageGrantGuidance {
  return {
    source_name: row?.source_name ?? null,
    due_at: row?.due_at ?? null,
    message: row?.message ?? null,
  };
}

export function summarizeGuidance(
  rows: readonly Partial<StageGrantGuidance>[],
): StageGrantGuidanceSummary {
  const first = guidanceOf(rows[0]);
  const uniform = rows.every((row) => JSON.stringify(guidanceOf(row)) === JSON.stringify(first));
  return { uniform, guidance: uniform && rows.length > 0 ? first : null };
}

export function guidanceValues(guidance: StageGrantGuidance | null) {
  return {
    sourceName: guidance?.source_name ?? null,
    dueAt: guidance?.due_at ?? null,
    message: guidance?.message ?? null,
  };
}

export function parseGuidance(body: unknown): {
  guidance: StageGrantGuidance;
  profileIds: string[] | null;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new ApiError("案内はオブジェクトで指定してください", 400);
  const value = body as Record<string, unknown>;
  for (const [key, max] of [
    ["source_name", 80],
    ["message", 500],
  ] as const) {
    const text = value[key];
    if (text !== null && (typeof text !== "string" || [...text].length > max))
      throw new ApiError(`${key} は ${max} 文字以内の文字列か null で指定してください`, 400);
  }
  const due = value.due_at;
  // Date.parse だけでは日付だけ・存在しない日付も通るので、日付と時刻を別に検証する。
  if (due !== null) {
    if (
      typeof due !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
        due,
      ) ||
      !Number.isFinite(Date.parse(due)) ||
      new Date(`${due.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== due.slice(0, 10)
    )
      throw new ApiError("due_at はタイムゾーン付き ISO 日時か null で指定してください", 400);
  }
  let profileIds: string[] | null = null;
  if (value.all === true && value.profile_ids === undefined) profileIds = null;
  else if (
    value.all === undefined &&
    Array.isArray(value.profile_ids) &&
    value.profile_ids.length > 0 &&
    value.profile_ids.every((id) => typeof id === "string" && id.trim() !== "")
  )
    profileIds = [...new Set((value.profile_ids as string[]).map((id) => id.trim()))];
  else throw new ApiError("all: true または profile_ids を指定してください", 400);
  return {
    guidance: {
      source_name: value.source_name as string | null,
      due_at: due === null ? null : new Date(due as string).toISOString(),
      message: value.message as string | null,
    },
    profileIds,
  };
}

export async function loadStageGuidance(db: Db, stageId: string) {
  return db
    .select({ profileId: stageGrants.profileId, ...guidanceColumns })
    .from(stageGrants)
    .where(eq(stageGrants.stageId, stageId));
}

/** 新規行だけを受け取る。祖先の自動割り当ても、その祖先自身の案内を継承する。 */
export async function inheritGrantGuidance(
  db: Db,
  rows: readonly { stageId: string; profileId: string }[],
) {
  const summaries = new Map<string, StageGrantGuidance | null>();
  for (const ids of chunk([...new Set(rows.map((row) => row.stageId))], 90)) {
    const saved = await db
      .select({ stageId: stageGrants.stageId, ...guidanceColumns })
      .from(stageGrants)
      .where(inArray(stageGrants.stageId, ids));
    for (const id of ids)
      summaries.set(id, summarizeGuidance(saved.filter((row) => row.stageId === id)).guidance);
  }
  return rows.map((row) => ({ ...row, ...guidanceValues(summaries.get(row.stageId) ?? null) }));
}
