/**
 * 組織マスタ API (Issue #29) — service-role 経由の特権操作。
 *
 *   GET  /api/admin/orgs          組織 (tenant) 一覧 + 所属ユーザー数
 *   POST /api/admin/orgs/upsert   組織の作成 / 編集
 *
 * 組織管理はテナント横断の特権操作のため、 呼び出し元が admin であることを検証し、
 * service-role で RLS を迂回して tenants を読み書きする (user-management と同方針)。
 * ブラウザの supabase クライアントからは tenants へ書き込めない (RLS は read のみ)。
 */

import {
  validateUpsertOrganization,
  type OrganizationRow,
} from "@falcon/shared/admin/types";
import { Hono, type Context } from "hono";

import type { Env } from "../env.js";
import {
  AdminApiError,
  authenticateAdmin,
  clientIp,
  getServiceClient,
  recordAuditLog,
} from "../lib/supabase-admin.js";

export const organizationsRoute = new Hono<{ Bindings: Env }>();

function errorResponse(c: Context<{ Bindings: Env }>, e: unknown) {
  if (e instanceof AdminApiError) {
    return c.json({ error: e.message }, e.status);
  }
  console.error("[orgs]", e);
  return c.json({ error: "内部エラーが発生しました" }, 500);
}

const TENANT_COLS =
  "id, name, subtitle, icon, contact_name, contact_email, plan_seats, contract_start, contract_end, active, created_at, updated_at";

// ---------------------------------------------------------------
// 一覧 (組織 + 所属ユーザー数)
// ---------------------------------------------------------------
organizationsRoute.get("/api/admin/orgs", async (c) => {
  try {
    const supabase = getServiceClient(c.env);
    await authenticateAdmin(c, supabase);

    const { data: tenants, error } = await supabase
      .from("tenants")
      .select(TENANT_COLS)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[orgs] list tenants failed", error);
      throw new AdminApiError("組織一覧の取得に失敗しました", 500);
    }

    // 所属ユーザー数 (無効化を除く) を 1 クエリで取得し、 tenant_id で集計する。
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("disabled", false);
    if (pErr) {
      console.error("[orgs] count members failed", pErr);
      throw new AdminApiError("所属ユーザー数の集計に失敗しました", 500);
    }
    const counts = new Map<string, number>();
    for (const row of (profiles as { tenant_id: string }[] | null) ?? []) {
      counts.set(row.tenant_id, (counts.get(row.tenant_id) ?? 0) + 1);
    }

    const organizations: OrganizationRow[] = (
      (tenants as Omit<OrganizationRow, "member_count">[] | null) ?? []
    ).map((t) => ({ ...t, member_count: counts.get(t.id) ?? 0 }));

    return c.json({ organizations });
  } catch (e) {
    return errorResponse(c, e);
  }
});

// ---------------------------------------------------------------
// 作成 / 編集
// ---------------------------------------------------------------
organizationsRoute.post("/api/admin/orgs/upsert", async (c) => {
  try {
    const supabase = getServiceClient(c.env);
    const caller = await authenticateAdmin(c, supabase);

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "リクエストボディが不正です" }, 400);
    }
    const validated = validateUpsertOrganization(raw);
    if (!validated.ok) {
      return c.json({ error: validated.message }, validated.status);
    }
    const v = validated.value;

    // 新規 / 既存を判定して監査の action を分ける (id は PK なので存在確認で足りる)。
    const { data: existing, error: findErr } = await supabase
      .from("tenants")
      .select("id")
      .eq("id", v.id)
      .maybeSingle();
    if (findErr) {
      console.error("[orgs] lookup tenant failed", findErr);
      throw new AdminApiError("組織の確認に失敗しました", 500);
    }
    const isCreate = !existing;

    const row = {
      id: v.id,
      name: v.name,
      subtitle: v.subtitle ?? null,
      contact_name: v.contactName ?? null,
      contact_email: v.contactEmail ?? null,
      plan_seats: v.planSeats ?? null,
      contract_start: v.contractStart ?? null,
      contract_end: v.contractEnd ?? null,
      active: v.active ?? true,
    };

    const { data: saved, error: upErr } = await supabase
      .from("tenants")
      .upsert(row, { onConflict: "id" })
      .select(TENANT_COLS)
      .single();
    if (upErr) {
      console.error("[orgs] upsert tenant failed", upErr);
      throw new AdminApiError("組織の保存に失敗しました", 500);
    }

    await recordAuditLog(supabase, {
      tenantId: caller.tenantId,
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: isCreate ? "org_create" : "org_update",
      targetType: "org",
      targetId: v.id,
      ip: clientIp(c),
      metadata: { name: v.name, active: row.active },
    });

    return c.json({ organization: saved });
  } catch (e) {
    return errorResponse(c, e);
  }
});
