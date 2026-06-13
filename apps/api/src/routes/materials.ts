/**
 * 教材アップロード API (旧 Supabase Storage 直アップロード + storage policy の置き換え)。
 *
 * Neon File Storage は S3 互換のため aws4fetch で SigV4 PUT する。
 * 旧 storage policy (tenant/{tenant_id}/... プレフィクス + staff のみ) をアプリ層で再現する。
 *
 * S3 認証情報 (MATERIALS_S3_*) 未設定時は 503 を返す (設定すれば動作する)。
 */

import { Hono } from "hono";
import { AwsClient } from "aws4fetch";

import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import type { Env } from "../env.js";

export const materialsRoute = new Hono<{ Bindings: Env }>();

materialsRoute.post("/api/materials/upload", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireRole(caller, "instructor", "admin");

    const env = c.env;
    if (
      !env.MATERIALS_S3_ENDPOINT ||
      !env.MATERIALS_S3_BUCKET ||
      !env.MATERIALS_S3_ACCESS_KEY_ID ||
      !env.MATERIALS_S3_SECRET_ACCESS_KEY
    ) {
      throw new ApiError("教材ストレージ (MATERIALS_S3_*) が未設定です", 503);
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

    const aws = new AwsClient({
      accessKeyId: env.MATERIALS_S3_ACCESS_KEY_ID,
      secretAccessKey: env.MATERIALS_S3_SECRET_ACCESS_KEY,
      region: env.MATERIALS_S3_REGION ?? "auto",
      service: "s3",
    });

    const base = env.MATERIALS_S3_ENDPOINT.replace(/\/+$/, "");
    const url = `${base}/${env.MATERIALS_S3_BUCKET}/${path}`;
    const body = await file.arrayBuffer();
    const res = await aws.fetch(url, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(`アップロードに失敗しました (${res.status}) ${text}`, 502);
    }

    return c.json({ path });
  } catch (err) {
    return errorResponse(c, err);
  }
});
