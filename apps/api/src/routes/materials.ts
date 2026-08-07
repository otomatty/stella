/**
 * 教材アップロード / レッスン配布資料 API。
 *
 * Cloudflare R2 バインディング (`MATERIALS_BUCKET`) 経由で PUT / GET する。
 * 旧 storage policy (tenant/{tenant_id}/... プレフィクス + staff のみ) をアプリ層で再現する。
 *
 * - POST   /api/materials/upload        … R2 アップロード。 `lessonId` を付けると
 *                                         lesson_materials 行も登録する (Issue #72)。
 * - GET    /api/materials?lessonId=...  … レッスンの配布資料一覧。
 *                                         受講者は published + active enrollment (quiz と同基準)。
 * - GET    /api/materials/:id/download  … R2 からのプロキシダウンロード (認可は一覧と同じ)。
 * - DELETE /api/materials/:id           … staff のみ。 DB 行を先に消し、 R2 はベストエフォート。
 *
 * R2 の `path` はクライアントへ返さない (バケットが公開 URL を持つ場合の直リンク緩和)。
 * ダウンロードは常に id ベースのプロキシ経由。
 *
 * R2 バインディング未設定時は 503 を返す (wrangler.toml の `[[r2_buckets]]` を参照)。
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";

import { courses, enrollments, lessonMaterials, lessons, sections } from "../db/schema.js";
import {
  errorResponse,
  getCaller,
  isStaffRole,
  requireRole,
  ApiError,
} from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const materialsRoute = new Hono<{ Bindings: Env }>();

/** サーバ側のアップロード上限 (クライアント側 LessonMaterialsPanel と同値)。 */
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

type MaterialSel = typeof lessonMaterials.$inferSelect;

// `path` は意図的に返さない (公開バケット直リンクの緩和 — ダウンロードは id ベースのプロキシ)。
const materialToRow = (m: MaterialSel) => ({
  id: m.id,
  lesson_id: m.lessonId,
  file_name: m.fileName,
  size_bytes: m.sizeBytes,
  mime_type: m.mimeType,
  created_by: m.createdBy,
  created_at: m.createdAt,
});

/** レッスンの所属テナント / コース公開状態 / コース ID を join で解決する。 */
async function lessonCourseInfo(
  db: Db,
  lessonId: string,
): Promise<{ tenantId: string; courseStatus: string; courseId: string } | null> {
  const rows = await db
    .select({
      tenantId: courses.tenantId,
      courseStatus: courses.status,
      courseId: courses.id,
    })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 配布資料の閲覧認可 (quiz.ts の isAuthorizedForLesson と同基準)。
 * - staff: 同テナントなら可
 * - student: published かつ当該コースに active enrollment
 */
async function assertMaterialReadable(
  db: Db,
  caller: Caller,
  lessonId: string,
): Promise<void> {
  const info = await lessonCourseInfo(db, lessonId);
  if (!info || info.tenantId !== caller.tenantId) {
    throw new ApiError("レッスンが見つかりません", 404);
  }
  if (isStaffRole(caller.role)) return;
  if (info.courseStatus !== "published") {
    throw new ApiError("レッスンが見つかりません", 404);
  }
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.courseId, info.courseId),
        eq(enrollments.status, "active"),
      ),
    )
    .limit(1);
  if (!enrolled[0]) throw new ApiError("レッスンが見つかりません", 404);
}

function requireBucket(env: Env): NonNullable<Env["MATERIALS_BUCKET"]> {
  const bucket = env.MATERIALS_BUCKET;
  if (!bucket) {
    throw new ApiError("教材ストレージ (R2 バインディング MATERIALS_BUCKET) が未設定です", 503);
  }
  return bucket;
}

materialsRoute.post("/api/materials/upload", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");

    const bucket = requireBucket(c.env);

    const form = await c.req.formData();
    const fileEntry = form.get("file") as unknown;
    // Workers の File 型は instanceof で判定しづらいため arrayBuffer の有無で判定する。
    if (
      !fileEntry ||
      typeof fileEntry === "string" ||
      typeof (fileEntry as { arrayBuffer?: unknown }).arrayBuffer !== "function"
    ) {
      throw new ApiError("file が必要です", 400);
    }
    const file = fileEntry as File;
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(
        `ファイルサイズが大きすぎます (${Math.round(file.size / 1024 / 1024)}MB > 200MB)`,
        400,
      );
    }
    const lessonId = String(form.get("lessonId") ?? "");

    let path: string;
    if (lessonId) {
      // レッスン配布資料: パスはサーバ側で組み立てる (クライアント指定パスを信用しない)。
      const info = await lessonCourseInfo(db, lessonId);
      if (!info || info.tenantId !== caller.tenantId) {
        throw new ApiError("レッスンが見つかりません", 404);
      }
      const safeName = file.name.replace(/[^\p{L}\p{N}.\-]+/gu, "_");
      const uniq = crypto.randomUUID().slice(0, 8);
      path = `tenant/${caller.tenantId}/lessons/${lessonId}/${uniq}-${safeName}`;
    } else {
      path = String(form.get("path") ?? "");
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
    }

    await bucket.put(path, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    });

    if (lessonId) {
      // insert 失敗時は R2 オブジェクトを削除して補償する (孤児オブジェクト防止)。
      let row: MaterialSel;
      try {
        row = (
          await db
            .insert(lessonMaterials)
            .values({
              lessonId,
              path,
              fileName: file.name,
              sizeBytes: file.size,
              mimeType: file.type || "application/octet-stream",
              createdBy: caller.id,
            })
            .returning()
        )[0]!;
      } catch (insertErr) {
        await bucket.delete(path).catch((e) => {
          console.error("[materials] R2 補償削除に失敗 (要手動クリーンアップ)", path, e);
        });
        throw insertErr;
      }
      return c.json({ row: materialToRow(row) });
    }

    return c.json({ path });
  } catch (err) {
    return errorResponse(c, err);
  }
});

materialsRoute.get("/api/materials", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const lessonId = c.req.query("lessonId");
    if (!lessonId) throw new ApiError("lessonId が必要です", 400);

    await assertMaterialReadable(db, caller, lessonId);

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.lessonId, lessonId))
      .orderBy(asc(lessonMaterials.createdAt));
    return c.json({ rows: rows.map(materialToRow) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

materialsRoute.get("/api/materials/:id/download", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const bucket = requireBucket(c.env);

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.id, c.req.param("id")))
      .limit(1);
    const material = rows[0];
    if (!material) throw new ApiError("資料が見つかりません", 404);

    await assertMaterialReadable(db, caller, material.lessonId);

    const object = await bucket.get(material.path);
    if (!object) throw new ApiError("資料の実体が見つかりません", 404);

    // 日本語ファイル名は RFC 5987 (filename*) でエンコードして返す。
    const encoded = encodeURIComponent(material.fileName).replace(/'/g, "%27");
    return new Response(object.body, {
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Length": String(object.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

materialsRoute.delete("/api/materials/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const bucket = requireBucket(c.env);

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.id, c.req.param("id")))
      .limit(1);
    const material = rows[0];
    if (!material) throw new ApiError("資料が見つかりません", 404);

    const info = await lessonCourseInfo(db, material.lessonId);
    if (!info || info.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントのリソースは操作できません", 403);
    }

    // DB 行を先に消す。 R2 削除失敗時は「一覧から見えない孤児オブジェクト」となり、
    // 「実体なしの行が残って DL が壊れる」よりリカバリしやすい。
    await db.delete(lessonMaterials).where(eq(lessonMaterials.id, material.id));
    await bucket.delete(material.path).catch((e) => {
      console.error("[materials] R2 削除に失敗 (孤児オブジェクト)", material.path, e);
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
