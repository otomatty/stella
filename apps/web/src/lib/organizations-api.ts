/**
 * 組織マスタのデータアクセス層 (Issue #29 — Neon / Hono API)。
 *
 * 一覧 / 作成 / 編集はテナント横断の特権操作のため、 `/api/admin/orgs*` (admin 認可) を呼ぶ。
 */

import type {
  ListOrganizationsResponse,
  OrganizationRow,
  UpsertOrganizationInput,
} from "@falcon/shared/admin/types";

import { apiFetch } from "./api-client";

/** 組織 (tenant) 一覧 + 所属ユーザー数。 */
export async function listOrganizations(): Promise<OrganizationRow[]> {
  const res = await apiFetch<ListOrganizationsResponse>("/api/admin/orgs");
  return res.organizations;
}

/** 組織を作成 / 編集する。 */
export async function upsertOrganization(
  input: UpsertOrganizationInput,
): Promise<OrganizationRow> {
  const res = await apiFetch<{ organization: OrganizationRow }>(
    "/api/admin/orgs/upsert",
    { method: "POST", body: input },
  );
  return res.organization;
}
