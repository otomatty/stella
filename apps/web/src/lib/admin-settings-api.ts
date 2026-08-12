/**
 * テナント設定 (テストモード) のデータアクセス層。
 *
 * 取得 / 更新は `/api/admin/settings` (tenant admin 認可) 経由で行う。
 */

import { apiFetch } from "./api-client";

export interface TenantSettings {
  test_mode: boolean;
}

export async function fetchTenantSettings(): Promise<TenantSettings> {
  const { settings } = await apiFetch<{ settings: TenantSettings }>(
    "/api/admin/settings",
  );
  return settings;
}

export async function updateTestMode(testMode: boolean): Promise<TenantSettings> {
  const { settings } = await apiFetch<{ settings: TenantSettings }>(
    "/api/admin/settings",
    { method: "POST", body: { testMode } },
  );
  return settings;
}
