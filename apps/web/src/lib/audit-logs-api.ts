/**
 * 監査ログのデータアクセス層 (Issue #27 — Neon / Hono API)。
 *
 * 読み取り専用。 認可はサーバ側で「同テナントの instructor/admin のみ」。 記録は管理 API 側。
 */

import { apiFetch } from "./api-client";

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

/** 一覧 (テーブル表示) の既定取得上限。 これを超える場合は CSV 出力で全件取得する。 */
export const DEFAULT_LIST_LIMIT = 500;

/** CSV 全件取得時の 1 ページあたり件数。 */
const EXPORT_PAGE_SIZE = 1000;

/** tenant / 期間 / 実行者 / 操作種別の絞り込みをクエリ文字列に組み立てる。 */
function buildQuery(
  opts: Omit<ListAuditLogsOpts, "tenantId">,
  limit: number,
  offset: number,
): string {
  const p = new URLSearchParams();
  // tenant はサーバが caller から決めるため送らない。
  if (opts.from) p.set("from", opts.from);
  if (opts.to) p.set("to", opts.to);
  if (opts.actorId) p.set("actorId", opts.actorId);
  if (opts.action) p.set("action", opts.action);
  p.set("limit", String(limit));
  p.set("offset", String(offset));
  return p.toString();
}

export async function listAuditLogs(opts: ListAuditLogsOpts): Promise<AuditLogRow[]> {
  const qs = buildQuery(opts, opts.limit ?? DEFAULT_LIST_LIMIT, 0);
  const { rows } = await apiFetch<{ rows: AuditLogRow[] }>(`/api/audit-logs?${qs}`);
  return rows ?? [];
}

/**
 * 絞り込み条件に一致する監査ログを全件取得する (CSV 出力用)。
 * 表示上限では証跡が欠落し得るため、 ページングで全件を辿る。
 */
export async function listAllAuditLogs(
  opts: Omit<ListAuditLogsOpts, "limit">,
): Promise<AuditLogRow[]> {
  const all: AuditLogRow[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
    const qs = buildQuery(opts, EXPORT_PAGE_SIZE, offset);
    const { rows } = await apiFetch<{ rows: AuditLogRow[] }>(`/api/audit-logs?${qs}`);
    const page = rows ?? [];
    all.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) break;
  }
  return all;
}
