import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PublicLesson, PublicUnit } from "@stella/shared/cms/types";

import { publicContentRoute } from "./public-content.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

/**
 * ログインなしで読める教材 (Issue #41)。印 (`lessons.public`) のあるレッスンだけを、
 * 公開テナントの入口の講座からだけ返すことを、実 SQLite (全 migration 適用済み) で確かめる。
 */

const PRIVATE_MARKER = "PRIVATE_SOLUTION_MARKER_41";
let db: ReturnType<typeof sqliteD1>;

function setup(): void {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES
      ('ses', 'SES', 0, 1, 0, 1, 1),
      ('coach', 'Coach', 0, 1, 0, 1, 1);
    INSERT INTO stages (id, tenant_id, slug, title, description, status, audience, format, prerequisites, created_at, updated_at) VALUES
      ('root', 'ses', 'dev-env-basics', '開発環境とWebの入口', 'ROOT_DESCRIPTION', 'published', 'catalog', 2, NULL, 1, 1),
      ('locked', 'ses', 'html-css-basics', 'HTMLとCSS', NULL, 'published', 'catalog', 2, '["dev-env-basics"]', 1, 1),
      ('granted', 'ses', 'salesforce-dev-basics', 'Salesforce', NULL, 'published', 'granted', 2, NULL, 1, 1),
      ('draft', 'ses', 'draft-course', '下書き', NULL, 'draft', 'catalog', 2, NULL, 1, 1),
      ('legacy', 'ses', 'python-basics', 'Python', NULL, 'published', 'catalog', 1, NULL, 1, 1),
      ('other', 'coach', 'dev-env-basics', '別テナントの入口', NULL, 'published', 'catalog', 2, '[]', 1, 1);
    INSERT INTO sections (id, stage_id, title, "order", created_at) VALUES
      ('u00', 'root', 'U00 開始と事前確認', 0, 1),
      ('u01', 'root', 'U01 VS Code の準備', 1, 1),
      ('m0', 'root', '最初のページ', 2, 1),
      ('locked-unit', 'locked', '単元', 0, 1),
      ('granted-unit', 'granted', '単元', 0, 1),
      ('draft-unit', 'draft', '単元', 0, 1),
      ('legacy-unit', 'legacy', '単元', 0, 1),
      ('other-unit', 'other', '単元', 0, 1);
    INSERT INTO lessons (id, section_id, title, type, "order", duration_label, markdown, total_pages, public, created_at, updated_at) VALUES
      ('u00-slides', 'u00', '学習の進め方', 'slides', 0, '3分', '# はじめに\n\n---\n\n# 2 枚目', 2, 1, 1, 1),
      ('u00-doc', 'u00', '0-1 まとめ', 'text', 1, '10分', ':::os windows\nWindows の手順\n:::\n:::os macos\nmacOS の手順\n:::', NULL, 1, 1, 1),
      ('u00-quiz', 'u00', '0-1 確認クイズ', 'quiz', 2, '5分', 'QUIZ_REFERENCES', NULL, 1, 1, 1),
      ('u00-empty', 'u00', '空のまとめ', 'text', 3, '10分', NULL, NULL, 1, 1, 1),
      ('u01-doc', 'u01', '1-1 まとめ', 'text', 0, '10分', 'VS Code を入れる', NULL, 1, 1, 1),
      ('m0-doc', 'm0', '2-1 まとめ', 'text', 0, '10分', 'NOT_PUBLIC_DOC', NULL, 0, 1, 1),
      ('m0-task', 'm0', '課題文', 'text', 1, '5分', 'TASK_README', NULL, 1, 1, 1),
      ('locked-doc', 'locked-unit', 'まとめ', 'text', 0, NULL, 'LOCKED_DOC', NULL, 1, 1, 1),
      ('granted-doc', 'granted-unit', 'まとめ', 'text', 0, NULL, 'GRANTED_DOC', NULL, 1, 1, 1),
      ('draft-doc', 'draft-unit', 'まとめ', 'text', 0, NULL, 'DRAFT_DOC', NULL, 1, 1, 1),
      ('legacy-doc', 'legacy-unit', 'まとめ', 'text', 0, NULL, 'LEGACY_DOC', NULL, 1, 1, 1),
      ('other-doc', 'other-unit', 'まとめ', 'text', 0, NULL, 'OTHER_TENANT_DOC', NULL, 1, 1, 1);
    INSERT INTO tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle, active, lesson_id) VALUES
      ('dev-env-basics/m0/q01', 'm0', '課題', 'practice', 'p', '{"uses":[],"assesses":[]}', 10, 0, 'h', '{}', '{}', 1, 'm0-task');
    INSERT INTO task_private (task_id, files) VALUES ('dev-env-basics/m0/q01', '${PRIVATE_MARKER}');
  `);
}

function envOf(overrides: Partial<Env> = {}): Env {
  return { DB: db.binding, PUBLIC_CONTENT_TENANT_ID: "ses", ...overrides } as Env;
}

async function get(path: string, env = envOf(), init: RequestInit & { token?: string } = {}) {
  const { app } = mountTestApp(env, publicContentRoute);
  return request(app, env, path, init);
}

beforeEach(setup);
afterEach(() => db.sqlite.close());

describe("GET /api/public/units", () => {
  it("ログインなしで、印のある入口の単元のスライドとまとめだけを並べる", async () => {
    const res = await get("/api/public/units");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    const { units } = await json<{ units: PublicUnit[] }>(res);
    expect(units).toEqual([
      {
        id: "u00",
        title: "U00 開始と事前確認",
        stage_title: "開発環境とWebの入口",
        lessons: [
          { id: "u00-slides", title: "学習の進め方", type: "slides", duration_label: "3分" },
          { id: "u00-doc", title: "0-1 まとめ", type: "text", duration_label: "10分" },
        ],
      },
      {
        id: "u01",
        title: "U01 VS Code の準備",
        stage_title: "開発環境とWebの入口",
        lessons: [{ id: "u01-doc", title: "1-1 まとめ", type: "text", duration_label: "10分" }],
      },
    ]);
  });

  it("本文・ステージの説明・前提・課題の素材を一覧に含めない", async () => {
    const body = await (await get("/api/public/units")).text();
    for (const marker of [
      "ROOT_DESCRIPTION",
      "dev-env-basics",
      "markdown",
      "prerequisites",
      PRIVATE_MARKER,
      "TASK_README",
      "NOT_PUBLIC_DOC",
    ])
      expect(body, marker).not.toContain(marker);
  });

  it("公開テナントが未設定なら何も返さない", async () => {
    const res = await get("/api/public/units", envOf({ PUBLIC_CONTENT_TENANT_ID: undefined }));
    expect(res.status).toBe(200);
    expect((await json<{ units: PublicUnit[] }>(res)).units).toEqual([]);
  });

  it("テナントは設定で決まり、別テナントの単元は混ざらない", async () => {
    const res = await get("/api/public/units", envOf({ PUBLIC_CONTENT_TENANT_ID: "coach" }));
    const { units } = await json<{ units: PublicUnit[] }>(res);
    expect(units.map((u) => u.id)).toEqual(["other-unit"]);
    expect(units[0]?.stage_title).toBe("別テナントの入口");
  });
});

describe("GET /api/public/lessons/:id", () => {
  it("印のあるレッスンの本文を、ログインなしで返す (OS 別のブロックもそのまま)", async () => {
    const res = await get("/api/public/lessons/u00-doc");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    const { lesson } = await json<{ lesson: PublicLesson }>(res);
    expect(lesson).toEqual({
      id: "u00-doc",
      title: "0-1 まとめ",
      type: "text",
      duration_label: "10分",
      markdown: ":::os windows\nWindows の手順\n:::\n:::os macos\nmacOS の手順\n:::",
      total_pages: null,
      unit_id: "u00",
      unit_title: "U00 開始と事前確認",
      stage_title: "開発環境とWebの入口",
    });
  });

  it("スライドはページ数と一緒に返す", async () => {
    const { lesson } = await json<{ lesson: PublicLesson }>(
      await get("/api/public/lessons/u00-slides"),
    );
    expect(lesson.type).toBe("slides");
    expect(lesson.total_pages).toBe(2);
  });

  it.each([
    ["印の無いレッスン", "m0-doc"],
    ["知識問題 (印があっても)", "u00-quiz"],
    ["課題文のレッスン (印があっても)", "m0-task"],
    ["本文の無いレッスン", "u00-empty"],
    ["前提のある講座 (霧・ロックの向こう)", "locked-doc"],
    ["専用星 (audience: granted)", "granted-doc"],
    ["下書きの講座", "draft-doc"],
    ["旧形式の講座", "legacy-doc"],
    ["別テナント", "other-doc"],
    ["存在しない", "no-such-lesson"],
  ])("%s は 404 で、中身を返さない", async (_label, id) => {
    const res = await get(`/api/public/lessons/${id}`);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBeNull();
    const body = await res.text();
    for (const marker of [
      "NOT_PUBLIC_DOC",
      "QUIZ_REFERENCES",
      "TASK_README",
      PRIVATE_MARKER,
      "LOCKED_DOC",
      "GRANTED_DOC",
      "DRAFT_DOC",
      "LEGACY_DOC",
      "OTHER_TENANT_DOC",
    ])
      expect(body).not.toContain(marker);
  });

  it("公開テナントが未設定なら 404", async () => {
    const res = await get("/api/public/lessons/u00-doc", envOf({ PUBLIC_CONTENT_TENANT_ID: "  " }));
    expect(res.status).toBe(404);
  });

  it("別テナントを公開テナントにすると、そのテナントのレッスンだけが返る", async () => {
    const env = envOf({ PUBLIC_CONTENT_TENANT_ID: "coach" });
    expect((await get("/api/public/lessons/other-doc", env)).status).toBe(200);
    expect((await get("/api/public/lessons/u00-doc", env)).status).toBe(404);
  });

  it("ログイン済みでも応答は同じで、トークンでテナントや範囲は変わらない", async () => {
    db.sqlite.exec(
      `INSERT INTO profiles (id, tenant_id, role, display_name, disabled, name_source, created_at) VALUES ('coach-admin', 'coach', 'admin', '管理者', 0, 'google', 1);`,
    );
    const secret = "public-content-test-secret";
    const env = envOf({ AUTH_JWT_SECRET: secret });
    const token = await signAccessToken(secret, "coach-admin", "admin@example.test");
    const res = await get("/api/public/lessons/m0-doc", env, { token });
    expect(res.status).toBe(404);
    const units = await json<{ units: PublicUnit[] }>(
      await get("/api/public/units", env, { token }),
    );
    expect(units.units.map((u) => u.id)).toEqual(["u00", "u01"]);
    // 壊れたトークンでも読める (認証を見ない)。
    expect((await get("/api/public/lessons/u00-doc", env, { token: "broken" })).status).toBe(200);
  });

  it("レート制限を超えたら 429 を返し、DB を読まない", async () => {
    const limiter = { limit: async () => ({ success: false }) } as unknown as RateLimit;
    const env = envOf({ PUBLIC_CONTENT_RATE_LIMITER: limiter, DB: undefined as never });
    expect((await get("/api/public/units", env)).status).toBe(429);
    expect((await get("/api/public/lessons/u00-doc", env)).status).toBe(429);
  });
});
