/**
 * 分析ダッシュボードのデータアクセス層 (Issue #28)。
 *
 * 集計は security definer RPC (get_tenant_analytics / get_instructor_overview) に
 * 集約されており、 呼び出し元が「同テナントの instructor/admin」 であることを
 * RPC 側で検証する。 ここではその RPC を呼ぶだけ。
 */

import type {
  InstructorOverview,
  TenantAnalytics,
} from "@falcon/shared/cms/types";

import { getSupabase } from "./supabase";

/** 管理者ダッシュボード用のテナント KPI 一式を取得する。 */
export async function getTenantAnalytics(): Promise<TenantAnalytics | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_tenant_analytics");
  if (error) throw new Error(error.message);
  return (data as TenantAnalytics | null) ?? null;
}

/** 講師ダッシュボード用の未返信 / 遅延 / 受講者進捗を取得する。 */
export async function getInstructorOverview(): Promise<InstructorOverview | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_instructor_overview");
  if (error) throw new Error(error.message);
  return (data as InstructorOverview | null) ?? null;
}
