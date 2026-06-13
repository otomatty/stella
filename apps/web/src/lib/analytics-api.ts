/**
 * 分析ダッシュボードのデータアクセス層 (Issue #28 — Neon / Hono API)。
 *
 * 集計はサーバ側 (`/api/analytics/*`) で行い、 同テナントの instructor/admin のみ実行できる。
 */

import type {
  InstructorOverview,
  TenantAnalytics,
} from "@falcon/shared/cms/types";

import { apiFetch } from "./api-client";

/** 管理者ダッシュボード用のテナント KPI 一式を取得する。 */
export async function getTenantAnalytics(): Promise<TenantAnalytics | null> {
  const { analytics } = await apiFetch<{ analytics: TenantAnalytics | null }>(
    "/api/analytics/tenant",
  );
  return analytics ?? null;
}

/** 講師ダッシュボード用の未返信 / 遅延 / 受講者進捗を取得する。 */
export async function getInstructorOverview(): Promise<InstructorOverview | null> {
  const { overview } = await apiFetch<{ overview: InstructorOverview | null }>(
    "/api/analytics/instructor",
  );
  return overview ?? null;
}
