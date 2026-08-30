/**
 * CMS API の **境界の責務** だけを見る route テスト。
 *
 *   - カタログの秘匿: ステージ一覧は staff だけ。 詳細は staff か受講登録のある受講者だけ
 *   - 前提ステージの保護: 前提に挙げられている公開ステージは、 非公開にも削除もできない
 *
 * D1 は使わず、 `getCaller` が返す db を「テーブル名と select の形だけを見る」偽物に
 * 差し替える (where 句は解釈しない — 認可の分岐はハンドラ側にあり、 そこを見たいため)。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import type { ProfileRole } from "../lib/authz.js";
import { cmsRoute } from "./cms.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

const DRIZZLE_NAME = Symbol.for("drizzle:Name");
const tableName = (table: object): string => (table as Record<symbol, string>)[DRIZZLE_NAME];

interface StageRowFixture {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  prerequisites: string | null;
}

const stageFixture = (over: Partial<StageRowFixture> & { id: string }): StageRowFixture => ({
  tenantId: "ses",
  slug: over.id,
  title: `${over.id} の講座`,
  status: "published",
  prerequisites: null,
  ...over,
});

/** テストごとに差し替える DB の中身と、 いま叩いているステージ id。 */
const state = {
  stages: [] as StageRowFixture[],
  /** 受講登録のある (userId, stageId) の組。 */
  enrollments: new Set<string>(),
  requestedStageId: "",
  callerRole: "student" as ProfileRole,
  callerId: "seed-learner",
  updated: [] as Record<string, unknown>[],
};

function resolveSelect(table: string, shape: Record<string, unknown> | undefined, limit?: number) {
  const keys = shape ? Object.keys(shape) : [];
  const mine = state.stages.filter((s) => s.tenantId === "ses");
  if (table === "stages") {
    // publishedDependents: 公開ステージを前提の判定用に全件引く。
    if (keys.includes("prerequisites")) return mine.filter((s) => s.status === "published");
    // 1 件取得 (詳細 / stageAuditInfo / stageTenant)。
    if (limit === 1) {
      const row = mine.find((s) => s.id === state.requestedStageId);
      if (!row) return [];
      return [{ ...row, tenant: row.tenantId, t: row.tenantId }];
    }
    // 一覧。
    return mine;
  }
  if (table === "enrollments") {
    return state.enrollments.has(`${state.callerId}:${state.requestedStageId}`)
      ? [{ id: "e1" }]
      : [];
  }
  // sections / lessons は今回の関心事ではないので空で返す (詳細は器だけ確かめる)。
  return [];
}

function createTestDb() {
  const buildSelect = (shape?: Record<string, unknown>) => {
    let from = "";
    const chain: Record<string, unknown> = {};
    chain.from = (table: object) => {
      from = tableName(table);
      return chain;
    };
    chain.where = () => chain;
    chain.innerJoin = () => chain;
    chain.orderBy = () => chain;
    chain.limit = (n: number) => Promise.resolve(resolveSelect(from, shape, n));
    // biome-ignore lint/suspicious/noThenProperty: drizzle のクエリは意図的に thenable
    chain.then = (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolveSelect(from, shape)).then(onFulfilled, onRejected);
    return chain;
  };
  return {
    select: (shape?: Record<string, unknown>) => buildSelect(shape),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updated.push(values);
          return [];
        },
      }),
    }),
  };
}

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  return {
    ...actual,
    getCaller: vi.fn(async (c: { req: { header: (name: string) => string | undefined } }) => {
      if (!(c.req.header("Authorization") ?? "").startsWith("Bearer ")) {
        throw new actual.ApiError("Authorization ヘッダが必要です", 401);
      }
      return {
        caller: {
          id: state.callerId,
          tenantId: "ses",
          role: state.callerRole,
          name: "テスト",
          email: null,
        },
        db: createTestDb(),
      };
    }),
  };
});

const app = new Hono<{ Bindings: Env }>().route("/", cmsRoute);
const env = {} as Env;

const request = (path: string, init: RequestInit = {}) => {
  // where 句を解釈しない偽 DB のために、 対象ステージ id をパスから拾っておく。
  state.requestedStageId = path.split("/").filter(Boolean).pop() ?? "";
  if (path.endsWith("/status")) {
    const parts = path.split("/").filter(Boolean);
    state.requestedStageId = parts[parts.length - 2] ?? "";
  }
  return app.request(
    path,
    { ...init, headers: { Authorization: "Bearer test", ...(init.headers ?? {}) } },
    env,
  );
};

const asRole = (
  role: ProfileRole,
  id = role === "student" ? "seed-learner" : "seed-instructor",
) => {
  state.callerRole = role;
  state.callerId = id;
};

beforeEach(() => {
  state.stages = [
    stageFixture({ id: "stage-html", slug: "html-css-basics" }),
    stageFixture({ id: "stage-css", slug: "modern-css-basics" }),
  ];
  state.enrollments = new Set();
  state.updated = [];
  asRole("student");
});

describe("GET /api/cms/stages (カタログの秘匿)", () => {
  it("受講者には返さない (403)", async () => {
    const res = await request("/api/cms/stages");
    expect(res.status).toBe(403);
  });

  it("営業にも返さない (staff 機能)", async () => {
    asRole("sales", "seed-sales");
    expect((await request("/api/cms/stages")).status).toBe(403);
  });

  it("staff には全ステージを返す (draft も含む)", async () => {
    state.stages.push(stageFixture({ id: "stage-draft", status: "draft" }));
    asRole("instructor");
    const res = await request("/api/cms/stages");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { id: string }[] };
    expect(body.rows.map((r) => r.id).sort()).toEqual(["stage-css", "stage-draft", "stage-html"]);
  });

  it("認証が無ければ 401", async () => {
    const res = await app.request("/api/cms/stages", {}, env);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cms/stages/:id (受講登録のある受講者だけ)", () => {
  it("未受講の受講者は 403", async () => {
    const res = await request("/api/cms/stages/stage-html");
    expect(res.status).toBe(403);
  });

  it("存在しない id でも未受講なら 403 (存在の有無を漏らさない)", async () => {
    const res = await request("/api/cms/stages/does-not-exist");
    expect(res.status).toBe(403);
  });

  it("受講中なら 200 で詳細を返す", async () => {
    state.enrollments.add("seed-learner:stage-html");
    const res = await request("/api/cms/stages/stage-html");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stage: { stage: { id: string } } | null };
    expect(body.stage?.stage.id).toBe("stage-html");
  });

  it("受講中でも draft の中身は返さない (published チェックは維持)", async () => {
    state.stages = [stageFixture({ id: "stage-html", status: "draft" })];
    state.enrollments.add("seed-learner:stage-html");
    const res = await request("/api/cms/stages/stage-html");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stage: null });
  });

  it("staff は受講登録が無くても引ける", async () => {
    asRole("instructor");
    const res = await request("/api/cms/stages/stage-html");
    expect(res.status).toBe(200);
  });

  it("旧拡張互換 /api/cms/courses/:id も受講中なら引ける (旧 key のまま)", async () => {
    state.enrollments.add("seed-learner:stage-html");
    const res = await request("/api/cms/courses/stage-html");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { course: { course: { id: string } } | null };
    expect(body.course?.course.id).toBe("stage-html");
  });

  it("旧拡張互換も未受講なら 403", async () => {
    expect((await request("/api/cms/courses/stage-html")).status).toBe(403);
  });
});

describe("前提ステージの保護 (非公開 / 削除)", () => {
  beforeEach(() => {
    asRole("admin", "seed-admin");
    // stage-css が stage-html を前提にしている (公開中)。
    state.stages = [
      stageFixture({ id: "stage-html", slug: "html-css-basics" }),
      stageFixture({
        id: "stage-css",
        slug: "modern-css-basics",
        title: "モダンCSS 入門",
        prerequisites: '["html-css-basics"]',
      }),
    ];
  });

  it("依存する公開ステージがあると非公開にできない (409 + 依存側のタイトル)", async () => {
    const res = await request("/api/cms/stages/stage-html/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "draft" }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toContain("モダンCSS 入門");
    expect(state.updated).toEqual([]);
  });

  it("依存する公開ステージがあると削除できない (409)", async () => {
    const res = await request("/api/cms/stages/stage-html", { method: "DELETE" });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toContain("モダンCSS 入門");
  });

  it("依存側が非公開なら止めない", async () => {
    const css = state.stages.find((s) => s.id === "stage-css");
    if (css) css.status = "draft";
    const res = await request("/api/cms/stages/stage-html/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "draft" }),
    });
    expect(res.status).toBe(200);
    expect(state.updated).toHaveLength(1);
  });

  it("誰にも前提にされていなければ非公開にできる", async () => {
    const res = await request("/api/cms/stages/stage-css/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "draft" }),
    });
    expect(res.status).toBe(200);
  });

  it("公開のまま status を書き換えるとき (published → published) は検査しない", async () => {
    const res = await request("/api/cms/stages/stage-html/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "published" }),
    });
    expect(res.status).toBe(200);
  });
});
