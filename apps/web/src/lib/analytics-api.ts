/**
 * 分析ダッシュボードのデータアクセス層 (Issue #28 — Neon / Hono API)。
 *
 * 集計はサーバ側 (`/api/analytics/*`) で行う。
 * URL `/api/analytics/tenant` は開いたままの古いタブが呼ぶので変えない。
 */

import type { Analytics } from "@stella/shared/cms/types";

import { apiFetch } from "./api-client";

/** 管理者ダッシュボード用の KPI 一式を取得する。 */
export async function getAnalytics(): Promise<Analytics | null> {
  const { analytics } = await apiFetch<{ analytics: Analytics | null }>("/api/analytics/tenant");
  return analytics ?? null;
}
