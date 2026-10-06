/**
 * コードの復習: 今日の類題と、類題の在庫 (#39・07 §7.2)。
 *
 * - `GET /api/variant-reviews/today`: 受講者本人の今日の類題 (1 問)。開いたときにその受講者の分だけ
 *   合格の記録・次の出題・在庫からの出題を進める (`lib/variant-reviews.ts`)。今日の類題が無ければ null。
 *   受講者は自分の出題だけを読める。類題そのものは「VS Code で開く」から既存の課題の配布で受け取る。
 * - `GET /api/variant-reviews/stock`: 講師・管理者向け。パターンごとの在庫の数と、在庫切れで
 *   待っている受講者。テナントの範囲で返す。
 */

import { Hono } from "hono";
import type { Env } from "../env.js";
import { errorResponse, getCaller, requireRole } from "../lib/authz.js";
import { loadTodayVariant, loadVariantStock } from "../lib/variant-reviews.js";

export const variantReviewsRoute = new Hono<{ Bindings: Env }>();

variantReviewsRoute.get("/api/variant-reviews/today", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    return c.json({ variant: await loadTodayVariant(db, caller) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

variantReviewsRoute.get("/api/variant-reviews/stock", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    return c.json({ patterns: await loadVariantStock(db, caller) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
