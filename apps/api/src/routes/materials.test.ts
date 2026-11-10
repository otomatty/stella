import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { materialsRoute } from "./materials.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "materials-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 0, 'google', 1),
      ('teacher', 'ses', 'admin', '講師', 0, 'google', 1);
    INSERT INTO stages (id, tenant_id, slug, title, status, created_at, updated_at) VALUES ('stage', 'ses', 'dev-env-basics', '開発環境', 'published', 1, 1);
    INSERT INTO sections (id, stage_id, title, "order", created_at) VALUES ('section', 'stage', '単元', 0, 1);
    INSERT INTO lessons (id, section_id, title, type, "order", created_at, updated_at) VALUES ('lesson', 'section', '0-1 まとめ', 'text', 0, 1, 1);
    INSERT INTO enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at) VALUES ('enrollment', 'ses', 'learner', 'stage', 'active', 1);
    -- OS ごとに分けた現行の資料と、分ける前に配っていた資料 (作らなくなった)
    INSERT INTO lesson_materials (id, lesson_id, path, file_name, size_bytes, mime_type, source, created_at, archived_at) VALUES
      ('combined', 'lesson', 'lesson-pdf/old.pdf', '0-1 まとめ.pdf', 3, 'application/pdf', 'auto', 1, 2),
      ('windows', 'lesson', 'lesson-pdf/w.pdf', '0-1 まとめ (Windows).pdf', 3, 'application/pdf', 'auto', 2, NULL),
      ('macos', 'lesson', 'lesson-pdf/m.pdf', '0-1 まとめ (macOS).pdf', 3, 'application/pdf', 'auto', 3, NULL),
      ('upload', 'lesson', 'uploads/handout.pdf', '補足資料.pdf', 3, 'application/pdf', 'upload', 4, NULL);
    INSERT INTO lesson_material_versions (material_id, version, path, source_hash, size_bytes, created_at) VALUES
      ('combined', 1, 'lesson-pdf/old-1.pdf', 'h1', 3, 1),
      ('combined', 2, 'lesson-pdf/old.pdf', 'h2', 3, 2);
  `);
  const bucket = {
    get: async (key: string) => ({ body: `pdf:${key}`, size: 4 + key.length }),
  } as unknown as R2Bucket;
  env = { DB: db.binding, AUTH_JWT_SECRET: SECRET, MATERIALS_BUCKET: bucket } as Env;
  app = mountTestApp(env, materialsRoute).app;
});
afterEach(() => db.sqlite.close());

const as = async (id: "learner" | "teacher", path: string) =>
  request(app, env, path, { token: await signAccessToken(SECRET, id, `${id}@example.test`) });
const ids = async (id: "learner" | "teacher", path: string) =>
  (await json<{ rows: { id: string }[] }>(await as(id, path))).rows.map((r) => r.id);

describe("教材から作らなくなった自動生成資料 (archived_at)", () => {
  it("受講者の一覧 (レッスン・ステージ) には出さない。includeArchived を付けても出さない", async () => {
    expect(await ids("learner", "/api/materials?lessonId=lesson")).toEqual([
      "windows",
      "macos",
      "upload",
    ]);
    expect(await ids("learner", "/api/materials?stageId=stage")).toEqual([
      "windows",
      "macos",
      "upload",
    ]);
    expect(await ids("learner", "/api/materials?lessonId=lesson&includeArchived=1")).toEqual([
      "windows",
      "macos",
      "upload",
    ]);
  });

  it("staff は既定では外し、includeArchived=1 で版履歴をたどれるように並べる", async () => {
    expect(await ids("teacher", "/api/materials?lessonId=lesson")).toEqual([
      "windows",
      "macos",
      "upload",
    ]);
    const rows = (
      await json<{ rows: { id: string; archived_at: string | null }[] }>(
        await as("teacher", "/api/materials?lessonId=lesson&includeArchived=1"),
      )
    ).rows;
    expect(rows.map((r) => r.id)).toEqual(["combined", "windows", "macos", "upload"]);
    expect(rows[0]?.archived_at).not.toBeNull();
    expect(rows[1]?.archived_at).toBeNull();
    const versions = await json<{ rows: { version: number }[] }>(
      await as("teacher", "/api/materials/combined/versions"),
    );
    expect(versions.rows.map((v) => v.version)).toEqual([2, 1]);
    expect((await as("teacher", "/api/materials/combined/versions/1/download")).status).toBe(200);
  });

  it("受講者は作らなくなった資料をダウンロードできない。staff はできる", async () => {
    expect((await as("learner", "/api/materials/combined/download")).status).toBe(404);
    expect((await as("learner", "/api/materials/windows/download")).status).toBe(200);
    expect((await as("teacher", "/api/materials/combined/download")).status).toBe(200);
  });
});

const patch = async (id: "learner" | "teacher", materialId: string, body: unknown) =>
  request(app, env, `/api/materials/${materialId}`, {
    method: "PATCH",
    token: await signAccessToken(SECRET, id, `${id}@example.test`),
    body: JSON.stringify(body),
    headers: { "cf-connecting-ip": "192.0.2.1" },
  });

const audits = () => db.sqlite.prepare("SELECT * FROM audit_logs ORDER BY rowid").all();

describe("手動アップロード資料の配信", () => {
  it("講師が外すと受講者の一覧とダウンロードから外れ、staff は引き続き取得できる", async () => {
    const res = await patch("teacher", "upload", { archived: true });
    expect(res.status).toBe(200);
    const { row } = await json<{ row: { id: string; archived_at: string; path?: string } }>(res);
    expect(row.id).toBe("upload");
    expect(row.archived_at).toEqual(expect.any(String));
    expect(row.path).toBeUndefined();
    for (const scope of ["lessonId=lesson", "stageId=stage"]) {
      expect(await ids("learner", `/api/materials?${scope}`)).toEqual(["windows", "macos"]);
      expect(await ids("learner", `/api/materials?${scope}&includeArchived=1`)).not.toContain(
        "upload",
      );
      expect(await ids("teacher", `/api/materials?${scope}&includeArchived=1`)).toContain("upload");
    }
    expect((await as("learner", "/api/materials/upload/download")).status).toBe(404);
    expect((await as("teacher", "/api/materials/upload/download")).status).toBe(200);
    expect(await (await as("teacher", "/api/materials/upload/download")).text()).toBe(
      "pdf:uploads/handout.pdf",
    );
  });

  it("戻すと受講者の一覧とダウンロードに戻り、同じ状態への更新は書き込み・監査を増やさない", async () => {
    expect((await patch("teacher", "upload", { archived: false })).status).toBe(200);
    expect(audits()).toHaveLength(0);
    expect((await patch("teacher", "upload", { archived: true })).status).toBe(200);
    const archivedAt = db.sqlite
      .prepare("SELECT archived_at FROM lesson_materials WHERE id = 'upload'")
      .get();
    expect((await patch("teacher", "upload", { archived: true })).status).toBe(200);
    expect(
      db.sqlite.prepare("SELECT archived_at FROM lesson_materials WHERE id = 'upload'").get(),
    ).toEqual(archivedAt);
    expect(audits()).toHaveLength(1);
    const restored = await patch("teacher", "upload", { archived: false });
    expect(restored.status).toBe(200);
    expect((await json<{ row: { archived_at: null } }>(restored)).row.archived_at).toBeNull();
    expect((await patch("teacher", "upload", { archived: false })).status).toBe(200);
    for (const scope of ["lessonId=lesson", "stageId=stage"]) {
      expect(await ids("learner", `/api/materials?${scope}`)).toContain("upload");
    }
    expect((await as("learner", "/api/materials/upload/download")).status).toBe(200);
    expect(audits().map((row) => row.action)).toEqual(["material_withdraw", "material_restore"]);
    for (const row of audits()) {
      expect(row).toMatchObject({
        actor_id: "teacher",
        target_type: "lesson_material",
        target_id: "upload",
        ip: "192.0.2.1",
      });
      expect(JSON.parse(String(row.metadata))).toEqual({
        lesson_id: "lesson",
        file_name: "補足資料.pdf",
      });
    }
  });

  it("受講者・自動生成資料・存在しない資料の更新を拒否する", async () => {
    expect((await patch("learner", "upload", { archived: true })).status).toBe(403);
    for (const archived of [true, false]) {
      expect((await patch("teacher", "windows", { archived })).status).toBe(400);
      expect((await patch("teacher", "combined", { archived })).status).toBe(400);
    }
    const missing = await patch("teacher", "missing", { archived: true });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "資料が見つかりません" });
    expect(audits()).toHaveLength(0);
  });

  it("レッスンがない資料は 404", async () => {
    db.sqlite.exec(
      "PRAGMA foreign_keys = OFF; UPDATE lesson_materials SET lesson_id = 'missing' WHERE id = 'upload'; PRAGMA foreign_keys = ON;",
    );
    const res = await patch("teacher", "upload", { archived: true });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "資料が見つかりません" });
    expect(audits()).toHaveLength(0);
  });

  it.each([
    null,
    [],
    true,
    "true",
    {},
    { archived: null },
    { archived: 1 },
    { archived: "true" },
    { archived: true, extra: 1 },
  ])("不正な本文 %j を拒否する", async (body) => {
    expect((await patch("teacher", "upload", body)).status).toBe(400);
    expect(audits()).toHaveLength(0);
  });

  it("JSON でない本文を拒否する", async () => {
    const res = await request(app, env, "/api/materials/upload", {
      method: "PATCH",
      token: await signAccessToken(SECRET, "teacher", "teacher@example.test"),
      body: "{",
    });
    expect(res.status).toBe(400);
    expect(audits()).toHaveLength(0);
  });
});
