/**
 * 組織マスタのデータアクセス層 (Issue #29)。
 *
 * 一覧 / 作成 / 編集はテナント横断の特権操作のため、 apps/api の
 * `/api/admin/orgs*` を Bearer トークン付きで呼ぶ (service-role 経由)。
 */

import type {
  ListOrganizationsResponse,
  OrganizationRow,
  UpsertOrganizationInput,
} from "@falcon/shared/admin/types";

import { getSession } from "./auth";

function serverUrl(): string {
  const url = import.meta.env.VITE_SERVER_URL;
  if (!url) return "";
  return url.replace(/\/$/, "");
}

async function authedFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const base = serverUrl();
  if (!base) {
    throw new Error("API サーバ (VITE_SERVER_URL) が未設定です");
  }
  const session = await getSession();
  if (!session) {
    throw new Error("ログインが必要です");
  }
  const res = await fetch(`${base}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(
      typeof err.error === "string" ? err.error : `HTTP ${res.status}`,
    );
  }
  return (await res.json()) as T;
}

/** 組織 (tenant) 一覧 + 所属ユーザー数。 */
export async function listOrganizations(): Promise<OrganizationRow[]> {
  const res = await authedFetch<ListOrganizationsResponse>("/api/admin/orgs", {
    method: "GET",
  });
  return res.organizations;
}

/** 組織を作成 / 編集する。 */
export async function upsertOrganization(
  input: UpsertOrganizationInput,
): Promise<OrganizationRow> {
  const res = await authedFetch<{ organization: OrganizationRow }>(
    "/api/admin/orgs/upsert",
    { method: "POST", body: input },
  );
  return res.organization;
}
