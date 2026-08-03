/**
 * 教材アップロード API (旧 Storage 直アップロード + storage policy の置き換え)。
 *
 * Cloudflare R2 バインディング (`MATERIALS_BUCKET`) 経由で PUT する。
 * 旧 storage policy (tenant/{tenant_id}/... プレフィクス + staff のみ) をアプリ層で再現する。
 *
 * R2 バインディング未設定時は 503 を返す (wrangler.toml の `[[r2_buckets]]` を参照)。
 */

import { Hono } from "hono";

import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import type { Env } from "../env.js";

export const materialsRoute = new Hono<{ Bindings: Env }>();

materialsRoute.post("/api/materials/upload", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");

    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) {
      throw new ApiError("教材ストレージ (R2 バインディング MATERIALS_BUCKET) が未設定です", 503);
    }

    const form = await c.req.formData();
    const fileEntry = form.get("file") as unknown;
    const path = String(form.get("path") ?? "");
    // Workers の File 型は instanceof で判定しづらいため arrayBuffer の有無で判定する。
    if (
      !fileEntry ||
      typeof fileEntry === "string" ||
      typeof (fileEntry as { arrayBuffer?: unknown }).arrayBuffer !== "function"
    ) {
      throw new ApiError("file が必要です", 400);
    }
    const file = fileEntry as File;

    // 旧 storage policy 相当: tenant/{caller.tenantId}/... に閉じる。
    // パストラバーサル ( .. ) やバックスラッシュを拒否し、 他テナント領域への書き込みを防ぐ。
    const segments = path.split("/");
    if (
      segments[0] !== "tenant" ||
      segments[1] !== caller.tenantId ||
      path.includes("..") ||
      path.includes("\\")
    ) {
      throw new ApiError("不正な保存先パスです", 403);
    }

    await bucket.put(path, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    });

    return c.json({ path });
  } catch (err) {
    return errorResponse(c, err);
  }
});
