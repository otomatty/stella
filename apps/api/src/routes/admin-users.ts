/**
 * ユーザー管理 API (Issue #22) — service-role 経由の特権操作。
 *
 *   POST /api/admin/users/invite   招待 (単体 / CSV 一括)
 *   POST /api/admin/users/role     ロール変更
 *   POST /api/admin/users/disable  無効化 / 復帰
 *
 * いずれも呼び出し元が admin であることを検証し、 操作対象を呼び出し元と同じテナントに限定する。
 * 自己のロール変更 / 自己の無効化は禁止 (自己昇格・自爆ロックアウト防止)。
 */

import {
  isProfileRole,
  validateInviteUsersRequest,
  type InviteResult,
} from "@falcon/shared/admin/types";
import { Hono, type Context } from "hono";

import type { Env } from "../env.js";
import {
  AdminApiError,
  authenticateAdmin,
  clientIp,
  getServiceClient,
  initialsFrom,
  requireSameTenantTarget,
  resolveInviteRedirect,
} from "../lib/supabase-admin.js";

export const adminUsersRoute = new Hono<{ Bindings: Env }>();

function errorResponse(c: Context<{ Bindings: Env }>, e: unknown) {
  if (e instanceof AdminApiError) {
    return c.json({ error: e.message }, e.status);
  }
  console.error("[admin-users]", e);
  return c.json({ error: "内部エラーが発生しました" }, 500);
}

// ---------------------------------------------------------------
// 招待 (単体 / CSV 一括)
// ---------------------------------------------------------------
adminUsersRoute.post("/api/admin/users/invite", async (c) => {
  try {
    const supabase = getServiceClient(c.env);
    const caller = await authenticateAdmin(c, supabase);

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "リクエストボディが不正です" }, 400);
    }
    const validated = validateInviteUsersRequest(raw);
    if (!validated.ok) {
      return c.json({ error: validated.message }, validated.status);
    }

    const redirectTo = resolveInviteRedirect(c.env);
    const ip = clientIp(c);
    const results: InviteResult[] = [];

    for (const inv of validated.invites) {
      try {
        // 既存プロフィールを email で先に確認し、 他テナントのユーザーを upsert で
        // 自テナントへ上書き (テナントハイジャック) するのを防ぐ。
        const { data: existing, error: findErr } = await supabase
          .from("profiles")
          .select("id, tenant_id")
          .eq("email", inv.email)
          .maybeSingle();
        if (findErr) {
          console.error("[admin-users] lookup existing profile failed", findErr);
          results.push({ email: inv.email, ok: false, error: "既存ユーザーの確認に失敗しました" });
          continue;
        }
        if (existing) {
          results.push({
            email: inv.email,
            ok: false,
            error:
              existing.tenant_id === caller.tenantId
                ? "このユーザーは既にこのテナントに登録 / 招待されています"
                : "このメールアドレスは既に別のテナントで登録されています",
          });
          continue;
        }

        const { data, error } = await supabase.auth.admin.inviteUserByEmail(
          inv.email,
          {
            data: {
              tenant_id: caller.tenantId,
              role: inv.role,
              display_name: inv.displayName,
            },
            ...(redirectTo ? { redirectTo } : {}),
          },
        );
        if (error || !data?.user) {
          if (error) console.error("[admin-users] invite failed", error);
          results.push({
            email: inv.email,
            ok: false,
            error: "招待に失敗しました",
          });
          continue;
        }

        // 受諾前から正しい tenant/role でプロフィールを作っておく (RLS では student 固定の
        // ため、 非 student ロールはこの service-role 経由でのみ設定できる)。
        // profiles upsert と監査記録を 1 つの RPC (単一トランザクション) で原子的に行う (#39)。
        const { error: pErr } = await supabase.rpc("admin_apply_invite", {
          p_actor_id: caller.id,
          p_actor_name: caller.name,
          p_actor_role: caller.role,
          p_tenant_id: caller.tenantId,
          p_target_id: data.user.id,
          p_email: inv.email,
          p_display_name: inv.displayName,
          p_role: inv.role,
          p_initials: initialsFrom(inv.displayName),
          p_ip: ip,
        });
        if (pErr) {
          // profiles 作成 / 監査記録に失敗したら auth.users 側もロールバックする。
          // (放置すると orphan auth ユーザーが残り、 同 email の再招待が詰まる)
          console.error("[admin-users] invite apply failed; rolling back auth user", pErr);
          // admin API は reject せず { error } を返すため、 戻り値を検査する。
          const { error: delErr } = await supabase.auth.admin.deleteUser(data.user.id);
          if (delErr) {
            console.error("[admin-users] auth user rollback failed", delErr);
          }
          results.push({ email: inv.email, ok: false, error: "プロフィール作成に失敗しました" });
        } else {
          results.push({ email: inv.email, ok: true, userId: data.user.id });
        }
      } catch (rowErr) {
        console.error("[admin-users] invite row failed", rowErr);
        results.push({
          email: inv.email,
          ok: false,
          error: "招待に失敗しました",
        });
      }
    }

    return c.json({ results });
  } catch (e) {
    return errorResponse(c, e);
  }
});

// ---------------------------------------------------------------
// ロール変更
// ---------------------------------------------------------------
adminUsersRoute.post("/api/admin/users/role", async (c) => {
  try {
    const supabase = getServiceClient(c.env);
    const caller = await authenticateAdmin(c, supabase);

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "リクエストボディが不正です" }, 400);
    }
    const body = raw as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (!isProfileRole(body.role)) {
      return c.json({ error: "role が不正です" }, 400);
    }
    // 自己のロール変更は不可 (自己昇格・最後の管理者ロックアウト防止)。
    if (userId === caller.id) {
      return c.json({ error: "自分自身のロールは変更できません" }, 400);
    }

    await requireSameTenantTarget(supabase, caller, userId);

    // ロール更新と監査記録を 1 つの RPC (単一トランザクション) で原子的に行う (#39)。
    // RPC は target を tenant 限定で再取得し、 TOCTOU での越テナント更新を防ぐ。
    const { error } = await supabase.rpc("admin_change_role", {
      p_actor_id: caller.id,
      p_actor_name: caller.name,
      p_actor_role: caller.role,
      p_tenant_id: caller.tenantId,
      p_target_id: userId,
      p_new_role: body.role,
      p_ip: clientIp(c),
    });
    if (error) {
      if (String(error.message).includes("target_not_found")) {
        throw new AdminApiError("対象ユーザーが見つかりません", 404);
      }
      console.error("[admin-users] role change failed", error);
      throw new AdminApiError("ロールの更新に失敗しました", 500);
    }

    return c.json({ ok: true });
  } catch (e) {
    return errorResponse(c, e);
  }
});

// ---------------------------------------------------------------
// 無効化 / 復帰
// ---------------------------------------------------------------
adminUsersRoute.post("/api/admin/users/disable", async (c) => {
  try {
    const supabase = getServiceClient(c.env);
    const caller = await authenticateAdmin(c, supabase);

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "リクエストボディが不正です" }, 400);
    }
    const body = raw as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return c.json({ error: "userId は必須です" }, 400);
    if (typeof body.disabled !== "boolean") {
      return c.json({ error: "disabled は真偽値である必要があります" }, 400);
    }
    if (userId === caller.id) {
      return c.json({ error: "自分自身は無効化できません" }, 400);
    }

    await requireSameTenantTarget(supabase, caller, userId);

    const disabled = body.disabled;

    // ban を元に戻すヘルパ (admin API は reject せず { error } を返すため戻り値を検査)。
    const rollbackBan = async () => {
      const { error: rbErr } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: disabled ? "none" : "876000h",
      });
      if (rbErr) console.error("[admin-users] ban rollback failed", rbErr);
    };

    // 実際のログイン遮断 (auth.users の ban) を先に適用する。
    // 100 年相当の ban を「無効」、 "none" で復帰。
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: disabled ? "876000h" : "none",
    });
    if (authErr) {
      console.error("[admin-users] auth ban update failed", authErr);
      throw new AdminApiError("無効化処理に失敗しました", 500);
    }

    // 表示用ミラー (profiles.disabled) と監査記録を 1 つの RPC (単一トランザクション) で
    // 原子的に行う (#39)。 失敗時は ban を元に戻し、 auth と profiles の不整合を残さない。
    const { error: pErr } = await supabase.rpc("admin_apply_disable", {
      p_actor_id: caller.id,
      p_actor_name: caller.name,
      p_actor_role: caller.role,
      p_tenant_id: caller.tenantId,
      p_target_id: userId,
      p_disabled: disabled,
      p_ip: clientIp(c),
    });
    if (pErr) {
      await rollbackBan();
      if (String(pErr.message).includes("target_not_found")) {
        throw new AdminApiError("対象ユーザーが見つかりません", 404);
      }
      console.error("[admin-users] disable apply failed; rolled back ban", pErr);
      throw new AdminApiError("無効化処理に失敗しました", 500);
    }

    return c.json({ ok: true });
  } catch (e) {
    return errorResponse(c, e);
  }
});
