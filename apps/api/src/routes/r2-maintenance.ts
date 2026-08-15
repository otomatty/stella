/**
 * R2 教材ストレージの保守 API (Issue #64 — orphan 掃除)。
 *
 *   GET  /api/admin/r2/orphans          … 参照されていない R2 オブジェクトの棚卸し (読み取りのみ)
 *   POST /api/admin/r2/orphans/cleanup  … 指定パスの削除 (明示的に渡したものだけ消す)
 *
 * 孤児が生まれる経路:
 *   - 教材の差し替え (`lessons.video_path` / `pdf_path` を上書きすると旧オブジェクトが残る)
 *   - 配布資料 / コース削除時の R2 削除失敗 (best-effort のためログだけ残して続行する)
 *   - アップロード成功後に DB insert が落ちたケースの補償削除漏れ
 *
 * 安全側の設計:
 *   - テナント管理者以上のみ。 走査も削除も `tenant/<callerTenant>/` 配下に限定する。
 *   - 参照は「配布資料 (lesson_materials.path)」だけでなく
 *     「レッスンの動画 / スライド (lessons.video_path / pdf_path)」も数える。
 *     ここを漏らすと配信中の教材を消してしまう。
 *   - 削除は棚卸しで返ったパスを呼び出し側が明示的に渡した場合のみ。 削除直前に
 *     参照有無を取り直し、 その間に参照が復活したパスはスキップする。
 */

import { Hono } from "hono";
import { and, eq, isNotNull, or } from "drizzle-orm";

import { courses, lessonMaterials, lessons, sections } from "../db/schema.js";
import { errorResponse, getCaller, requireTenantAdmin, ApiError } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const r2MaintenanceRoute = new Hono<{ Bindings: Env }>();

/** 1 回の棚卸しで走査する R2 オブジェクトの上限。 超えた分は truncated で知らせる。 */
const MAX_SCAN = 5000;
const LIST_PAGE = 1000;

/** 1 回の削除リクエストで受け付けるパス数の上限。 */
const MAX_DELETE = 1000;

function requireBucket(env: Env): NonNullable<Env["MATERIALS_BUCKET"]> {
  const bucket = env.MATERIALS_BUCKET;
  if (!bucket) {
    throw new ApiError("教材ストレージ (R2 バインディング MATERIALS_BUCKET) が未設定です", 503);
  }
  return bucket;
}

/**
 * テナント配下で「参照されている」R2 パスを集める。
 * 配布資料 + レッスンの動画 / スライドの両方を対象にする。
 */
async function referencedPaths(db: Db, tenantId: string): Promise<Set<string>> {
  const materialRows = await db
    .select({ path: lessonMaterials.path })
    .from(lessonMaterials)
    .innerJoin(lessons, eq(lessons.id, lessonMaterials.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(courses.tenantId, tenantId));

  const lessonRows = await db
    .select({ videoPath: lessons.videoPath, pdfPath: lessons.pdfPath })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(
      and(
        eq(courses.tenantId, tenantId),
        or(isNotNull(lessons.videoPath), isNotNull(lessons.pdfPath)),
      ),
    );

  const set = new Set<string>();
  for (const r of materialRows) set.add(r.path);
  for (const r of lessonRows) {
    if (r.videoPath) set.add(r.videoPath);
    if (r.pdfPath) set.add(r.pdfPath);
  }
  return set;
}

/**
 * `tenant/<tenantId>/` 配下のオブジェクトを 1 リクエスト分だけ列挙する。
 *
 * 上限に達したら R2 のカーソルを返し、 呼び出し側が次のリクエストで続きから再開できる
 * ようにする。 上限で打ち切って毎回先頭から数え直すと、 オブジェクトが上限を超える
 * テナントでは打ち切り位置より後ろの孤児に永久に到達できない。
 */
async function listTenantObjects(
  bucket: NonNullable<Env["MATERIALS_BUCKET"]>,
  prefix: string,
  startCursor: string | undefined,
  max: number,
): Promise<{
  objects: Array<{ key: string; size: number; uploaded: string }>;
  nextCursor: string | null;
}> {
  const objects: Array<{ key: string; size: number; uploaded: string }> = [];
  let cursor = startCursor;
  for (;;) {
    const page = await bucket.list({
      prefix,
      limit: Math.min(LIST_PAGE, max - objects.length),
      cursor,
    });
    for (const o of page.objects) {
      objects.push({ key: o.key, size: o.size, uploaded: o.uploaded.toISOString() });
    }
    if (!page.truncated) return { objects, nextCursor: null };
    cursor = page.cursor;
    if (objects.length >= max) return { objects, nextCursor: cursor };
  }
}

r2MaintenanceRoute.get("/api/admin/r2/orphans", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);
    const bucket = requireBucket(c.env);

    const startCursor = c.req.query("cursor") || undefined;
    // `max` は 1 リクエストで走査する件数。 大きなバケットを小分けに掃除したいとき用。
    const requestedMax = Number(c.req.query("max"));
    const max =
      Number.isFinite(requestedMax) && requestedMax > 0
        ? Math.min(requestedMax, MAX_SCAN)
        : MAX_SCAN;

    const prefix = `tenant/${caller.tenantId}/`;
    const [{ objects, nextCursor }, referenced] = await Promise.all([
      listTenantObjects(bucket, prefix, startCursor, max),
      referencedPaths(db, caller.tenantId),
    ]);

    const orphans = objects.filter((o) => !referenced.has(o.key));

    // DB には行があるのに実体が無いパス (ダウンロードが 404 になる) も併せて出す。
    // ただしこれはテナント配下を 1 リクエストで走査し切れたときだけ判定できる。
    // 分割走査の途中では「今回のページに出てこなかっただけ」の参照を実体なしと
    // 誤報してしまうため、 判定自体を行わない。
    const fullScan = !startCursor && nextCursor === null;
    const presentKeys = new Set(objects.map((o) => o.key));
    const missing = fullScan
      ? [...referenced].filter((p) => p.startsWith(prefix) && !presentKeys.has(p))
      : [];

    return c.json({
      prefix,
      scanned: objects.length,
      truncated: nextCursor !== null,
      next_cursor: nextCursor,
      referenced_count: referenced.size,
      orphans,
      orphan_bytes: orphans.reduce((a, o) => a + o.size, 0),
      missing,
      missing_checked: fullScan,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

r2MaintenanceRoute.post("/api/admin/r2/orphans/cleanup", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireTenantAdmin(caller);
    const bucket = requireBucket(c.env);

    const body = (await c.req.json().catch(() => null)) as { paths?: unknown } | null;
    const paths = Array.isArray(body?.paths)
      ? body.paths.filter((p): p is string => typeof p === "string")
      : [];
    if (paths.length === 0) throw new ApiError("削除するパス (paths) が必要です", 400);
    if (paths.length > MAX_DELETE) {
      throw new ApiError(`一度に削除できるのは ${MAX_DELETE} 件までです`, 400);
    }

    // 他テナント領域やパストラバーサルは受け付けない。
    const prefix = `tenant/${caller.tenantId}/`;
    for (const p of paths) {
      if (!p.startsWith(prefix) || p.includes("..") || p.includes("\\")) {
        throw new ApiError(`削除できないパスが含まれています: ${p}`, 403);
      }
    }

    // 棚卸しから削除までの間に参照が復活している可能性があるため取り直す。
    const referenced = await referencedPaths(db, caller.tenantId);
    const target = paths.filter((p) => !referenced.has(p));
    const skipped = paths.filter((p) => referenced.has(p));

    if (target.length > 0) {
      await bucket.delete(target);
      await recordAudit(db, caller, {
        action: "r2_orphan_cleanup",
        targetType: "storage",
        targetId: null,
        ip: clientIp(c),
        metadata: { prefix, deleted: target.length, skipped: skipped.length },
      });
    }

    return c.json({ deleted: target.length, skipped });
  } catch (err) {
    return errorResponse(c, err);
  }
});
