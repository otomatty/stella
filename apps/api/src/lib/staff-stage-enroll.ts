import { eq } from "drizzle-orm";

import { RETIRED_STAGES } from "@stella/shared/curriculum/retired-stages";

import type { Db } from "../db/client.js";
import { stages } from "../db/schema.js";

const RETIRED_STAGE_KEYS = new Set(RETIRED_STAGES.map((row) => `${row.tenantId}\0${row.slug}`));

/** 講師・管理者が受講者の画面で確認できる、公開中かつ退役していないステージ。 */
export async function loadStaffEnrollableStage(
  db: Db,
  stageId: string,
): Promise<{ id: string; slug: string } | null> {
  const [stage] = await db
    .select({ id: stages.id, slug: stages.slug, tenantId: stages.tenantId, status: stages.status })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (stage?.status !== "published" || RETIRED_STAGE_KEYS.has(`${stage.tenantId}\0${stage.slug}`)) {
    return null;
  }
  return { id: stage.id, slug: stage.slug };
}
