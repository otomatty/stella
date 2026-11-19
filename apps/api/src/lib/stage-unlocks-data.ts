import { eq } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { stageUnlocks } from "../db/schema.js";
import type { Caller } from "./authz.js";

/** 前提の免除や廃止前の飛び級で開いた星の id 集合 (本人の行だけ)。 */
export async function loadUnlockedStageIds(db: Db, caller: Caller): Promise<Set<string>> {
  const rows = await db
    .select({ stageId: stageUnlocks.stageId })
    .from(stageUnlocks)
    .where(eq(stageUnlocks.userId, caller.id));
  return new Set(rows.map((row) => row.stageId));
}
