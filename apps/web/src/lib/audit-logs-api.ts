/**
 * 監査ログのデータアクセス層 (Issue #27)。
 *
 * 読み取り専用。 audit_logs は RLS で「同テナントの instructor/admin のみ SELECT 可」
 * かつ append-only (INSERT/UPDATE/DELETE ポリシー無し) のため、 ここでは select のみ提供する。
 * 記録は service-role 経由の管理 API / DB トリガーで行う (audit_logs migration 参照)。
 */

import { getSupabase } from "./supabase";

export interface AuditLogRow {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  ip: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ListAuditLogsOpts {
  tenantId: string;
  /** 開始日時 (ISO, inclusive)。 未指定なら下限なし。 */
  from?: string | null;
  /** 終了日時 (ISO, inclusive)。 未指定なら上限なし。 */
  to?: string | null;
  /** 実行者 (profiles.id) で絞り込む。 */
  actorId?: string | null;
  /** 操作種別で絞り込む。 */
  action?: string | null;
  /** 取得上限 (既定 500)。 */
  limit?: number;
}

const COLUMNS =
  "id, tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, ip, metadata, created_at";

/** 一覧 (テーブル表示) の既定取得上限。 これを超える場合は CSV 出力で全件取得する。 */
export const DEFAULT_LIST_LIMIT = 500;

/** CSV 全件取得時の 1 ページあたり件数。 */
const EXPORT_PAGE_SIZE = 1000;

/** tenant / 期間 / 実行者 / 操作種別の絞り込みを共通適用する。 */
function buildFilteredQuery(opts: ListAuditLogsOpts) {
  const supabase = getSupabase();
  let query = supabase
    .from("audit_logs")
    .select(COLUMNS)
    .eq("tenant_id", opts.tenantId)
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("created_at", opts.from);
  if (opts.to) query = query.lte("created_at", opts.to);
  if (opts.actorId) query = query.eq("actor_id", opts.actorId);
  if (opts.action) query = query.eq("action", opts.action);
  return query;
}

export async function listAuditLogs(
  opts: ListAuditLogsOpts,
): Promise<AuditLogRow[]> {
  const { data, error } = await buildFilteredQuery(opts).limit(
    opts.limit ?? DEFAULT_LIST_LIMIT,
  );
  if (error) throw new Error(error.message);
  return (data as AuditLogRow[] | null) ?? [];
}

/**
 * 絞り込み条件に一致する監査ログを全件取得する (CSV 出力用)。
 * 一覧の表示上限 (DEFAULT_LIST_LIMIT) では証跡が欠落し得るため、 監査・コンプライアンス
 * 用途のエクスポートはページングで全件を辿る。
 */
export async function listAllAuditLogs(
  opts: Omit<ListAuditLogsOpts, "limit">,
): Promise<AuditLogRow[]> {
  const all: AuditLogRow[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
    const { data, error } = await buildFilteredQuery(opts).range(
      offset,
      offset + EXPORT_PAGE_SIZE - 1,
    );
    if (error) throw new Error(error.message);
    const rows = (data as AuditLogRow[] | null) ?? [];
    all.push(...rows);
    if (rows.length < EXPORT_PAGE_SIZE) break;
  }
  return all;
}
