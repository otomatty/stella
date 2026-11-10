/**
 * 分析ダッシュボードのデータアクセス層 (Issue #28 — Neon / Hono API)。
 *
 * 集計はサーバ側 (`/api/analytics/*`) で行い、 instructor/admin のみ実行できる。
 * URL `/api/analytics/tenant` は開いたままの古いタブが呼ぶので変えない。
 */

import type { InstructorOverview, Analytics } from "@stella/shared/cms/types";

import { apiFetch } from "./api-client";

/** 管理者ダッシュボード用の KPI 一式を取得する。 */
export async function getAnalytics(): Promise<Analytics | null> {
  const { analytics } = await apiFetch<{ analytics: Analytics | null }>("/api/analytics/tenant");
  return analytics ?? null;
}

/** 講師ダッシュボード用の未返信 / 遅延 / 受講者進捗を取得する。 */
export async function getInstructorOverview(): Promise<InstructorOverview | null> {
  const { overview } = await apiFetch<{ overview: InstructorOverview | null }>(
    "/api/analytics/instructor",
  );
  return overview ?? null;
}
