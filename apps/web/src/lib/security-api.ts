/**
 * セキュリティ監視 (管理者の「セキュリティ」画面) の API クライアント。
 *
 * 認可はサーバ側 (同テナントの admin / platform_admin のみ)。テナントは caller から決まるので送らない。
 */

import type {
  SecurityAccountRow,
  SecurityAlertRow,
  SecurityAlertStatus,
  SecurityEventKind,
  SecurityEventRow,
  SecurityOverview,
} from "@stella/shared/security/types";

import { apiFetch } from "./api-client";

/** アラート一覧の絞り込み。active = 未対応 + 確認中。 */
export type SecurityAlertFilter = "active" | SecurityAlertStatus | "all";

export interface SecurityEventQuery {
  kinds?: readonly (SecurityEventKind | string)[];
  /** 何日前まで (1〜180)。 */
  days?: number;
  /** メールアドレス・IP・表示名の部分一致。 */
  q?: string;
  actorId?: string;
  /** これより古い出来事だけ (前のページの最後の created_at)。 */
  before?: string;
  /** 前のページの最後の行の ID (同じ時刻の行を取りこぼさないため `before` と一緒に送る)。 */
  beforeId?: string;
  limit?: number;
}

export interface SecurityScanResult {
  new_alerts: number;
  access_log_error: boolean;
}

export function fetchSecurityOverview(): Promise<SecurityOverview> {
  return apiFetch<SecurityOverview>("/api/security/overview");
}

/** アラート (最後に起きた順)。続きは最後の行の last_seen_at と id を `before` / `beforeId` に渡して取る。 */
export async function listSecurityAlerts(
  status: SecurityAlertFilter = "active",
  page: { limit?: number; before?: string; beforeId?: string } = {},
): Promise<SecurityAlertRow[]> {
  const p = new URLSearchParams({ status });
  if (page.limit) p.set("limit", String(page.limit));
  if (page.before) {
    p.set("before", page.before);
    if (page.beforeId) p.set("beforeId", page.beforeId);
  }
  const { rows } = await apiFetch<{ rows: SecurityAlertRow[] }>(`/api/security/alerts?${p}`);
  return rows ?? [];
}

export async function updateSecurityAlert(
  id: string,
  body: { status: SecurityAlertStatus; note?: string },
): Promise<void> {
  await apiFetch(`/api/security/alerts/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

/** 出来事の一覧のクエリ文字列 (空の条件は送らない)。 */
export function securityEventsQuery(query: SecurityEventQuery): string {
  const p = new URLSearchParams();
  if (query.kinds && query.kinds.length > 0) p.set("kind", query.kinds.join(","));
  if (query.days) p.set("days", String(query.days));
  const q = query.q?.trim();
  if (q) p.set("q", q);
  if (query.actorId) p.set("actorId", query.actorId);
  if (query.before) p.set("before", query.before);
  if (query.before && query.beforeId) p.set("beforeId", query.beforeId);
  if (query.limit) p.set("limit", String(query.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** 出来事 (新しい順)。続きは最後の行の created_at と id を `before` / `beforeId` に渡して取る。 */
export async function listSecurityEvents(
  query: SecurityEventQuery = {},
): Promise<SecurityEventRow[]> {
  const { rows } = await apiFetch<{ rows: SecurityEventRow[] }>(
    `/api/security/events${securityEventsQuery(query)}`,
  );
  return rows ?? [];
}

export async function listSecurityAccounts(): Promise<SecurityAccountRow[]> {
  const { rows } = await apiFetch<{ rows: SecurityAccountRow[] }>("/api/security/accounts");
  return rows ?? [];
}

export async function revokeAccessSessions(profileId: string): Promise<void> {
  await apiFetch(`/api/security/accounts/${encodeURIComponent(profileId)}/revoke`, {
    method: "POST",
  });
}

export function runSecurityScan(): Promise<SecurityScanResult> {
  return apiFetch<SecurityScanResult>("/api/security/scan", { method: "POST" });
}
