/**
 * Phase 3b — ステージの自己開始 (`POST /api/stages/:id/start`) の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 開始してよい星かを評価器で決めている (unlocked / active だけ通す)
 *   - 断り方が状態ごとに正しい (cleared はそのまま / locked は前提名 / fog は汎用文言)
 *   - 霧の 400 が「存在しない星」「フォーカス切り替え」と **同じ文言** (存在を漏らさない)
 *   - 二重に始めても登録が増えない (冪等)
 *   - 学習を見る側のロール (講師 / 営業) は 403
 *
 * D1 は `lib/skill-map-data.js` / `lib/enrollment-write.js` を差し替えて、インメモリの
 * 道と登録集合で代用する (skill-map.test.ts / stage-queue.test.ts と同じ流儀)。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { recordAudit } from "../lib/audit.js";
import type { ProfileRole } from "../lib/authz.js";
import { startSelfEnrollment } from "../lib/enrollment-write.js";
import { loadEnrolledStageIds, loadSkillMapSource } from "../lib/skill-map-data.js";
import { skillMapRoute } from "./skill-map.js";
import { stageStartRoute } from "./stage-start.js";

vi.mock("../lib/skill-map-data.js", () => ({
  loadSkillMapSource: vi.fn(),
  loadSkillProfileCounts: vi.fn(),
  loadStudyDays: vi.fn(),
  loadEnrolledStageIds: vi.fn(),
  loadFocusCompletions: vi.fn(),
  loadFocusStageId: vi.fn(),
  saveFocusStageId: vi.fn(),
}));

vi.mock("../lib/enrollment-write.js", () => ({
  startSelfEnrollment: vi.fn(),
}));

// 監査は best-effort の付随処理。ここでは呼ばれても落ちないことだけ担保する。
vi.mock("../lib/audit.js", () => ({
  clientIp: () => null,
  recordAudit: vi.fn(async () => undefined),
}));

const BASE_CALLER = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student" as ProfileRole,
  name: "受講者",
  email: null,
};

/** テストごとに差し替える呼び出し元 (ロールを変える test がある)。 */
let caller: typeof BASE_CALLER;

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  return {
    ...actual,
    getCaller: vi.fn(async (c: { req: { header: (name: string) => string | undefined } }) => {
      const header = c.req.header("Authorization") ?? "";
      if (!header.startsWith("Bearer ")) {
        throw new actual.ApiError("Authorization ヘッダが必要です", 401);
      }
      return { caller, db: {} };
    }),
  };
});

const app = new Hono<{ Bindings: Env }>().route("/", stageStartRoute).route("/", skillMapRoute);
const env = {} as Env;

/**
 * 一本道 a → b → c → far → fog (id = slug)。
 *
 * 起点 (前提なし) は a なので、a = unlocked・b = locked (full)・c = name-only の locked・
 * far / fog は霧。cleared は個別に足す。
 *
 * c には **霧の中にある前提** (`stage-deep`) も持たせてある。deep は未知 slug を前提に
 * 持つので他の星と辺で繋がらず、c 経由の距離 3 = 霧に落ちる。「見えている星の解放条件
 * から霧の星の名前が読めない」ことを見るための配置。
 */
function pathSource(cleared: string[] = []) {
  const stage = (slug: string, prerequisites: string[]) => ({
    id: slug,
    slug,
    title: `${slug} の講座`,
    prerequisites,
    category: "プログラミング",
    theme: "テーマX",
  });
  return {
    stages: [
      stage("stage-a", []),
      stage("stage-b", ["stage-a"]),
      stage("stage-c", ["stage-b", "stage-deep"]),
      stage("stage-deep", ["stage-never-published"]),
      stage("stage-far", ["stage-c"]),
      stage("stage-fog", ["stage-far"]),
    ],
    clearedStageIds: new Set(cleared),
    enrolledStageIds: new Set(enrolledIds),
  };
}

/** 自己開始で作られた登録 (冪等の確認に使う)。 */
let enrolledIds: Set<string>;

function start(stageId: string, opts: { auth?: boolean } = {}) {
  const { auth = true } = opts;
  return app.request(
    `/api/stages/${stageId}/start`,
    { method: "POST", headers: auth ? { Authorization: "Bearer test" } : {} },
    env,
  );
}

async function errorOf(res: Response): Promise<string> {
  return ((await res.json()) as { error?: string }).error ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  caller = { ...BASE_CALLER };
  enrolledIds = new Set<string>();
  vi.mocked(loadSkillMapSource).mockImplementation(async () => pathSource());
  vi.mocked(loadEnrolledStageIds).mockImplementation(async () => new Set(enrolledIds));
  vi.mocked(startSelfEnrollment).mockImplementation(async (_db, _caller, stageId) => {
    const created = !enrolledIds.has(stageId);
    enrolledIds.add(stageId);
    return { row: { id: `enr-${stageId}` }, created, reactivated: false } as Awaited<
      ReturnType<typeof startSelfEnrollment>
    >;
  });
});

describe("POST /api/stages/:id/start", () => {
  it("認証が無ければ 401", async () => {
    expect((await start("stage-a", { auth: false })).status).toBe(401);
  });

  it("解放済み (unlocked) の星は始められる", async () => {
    const res = await start("stage-a");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      enrollment: { id: string };
      created: boolean;
      state: string;
    };
    expect(body.state).toBe("unlocked");
    expect(body.created).toBe(true);
    expect(body.enrollment.id).toBe("enr-stage-a");
    expect(startSelfEnrollment).toHaveBeenCalledWith({}, caller, "stage-a");
  });

  it("二重に始めても登録は増えない (冪等・created:false)", async () => {
    expect((await start("stage-a")).status).toBe(200);
    const again = await start("stage-a");
    expect(again.status).toBe(200);
    expect(((await again.json()) as { created: boolean }).created).toBe(false);
    expect(enrolledIds.size).toBe(1);
  });

  it("期限切れから戻した登録は reactivated:true で 200 (再開の道が塞がらない)", async () => {
    enrolledIds.add("stage-a");
    vi.mocked(startSelfEnrollment).mockResolvedValueOnce({
      row: { id: "enr-stage-a", status: "active" },
      created: false,
      reactivated: true,
    } as Awaited<ReturnType<typeof startSelfEnrollment>>);
    const res = await start("stage-a");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { created: boolean; reactivated: boolean };
    expect(body).toMatchObject({ created: false, reactivated: true });
    // 登録が動いた (= 再開した) ので監査には残す。
    expect(recordAudit).toHaveBeenCalledWith(
      {},
      caller,
      expect.objectContaining({
        action: "stage_self_start",
        metadata: expect.objectContaining({ reactivated: true }),
      }),
    );
  });

  it("何も動かない 2 度目の「始める」は監査に積まない", async () => {
    await start("stage-a");
    vi.mocked(recordAudit).mockClear();
    expect((await start("stage-a")).status).toBe(200);
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("進行中 (active) の星は再開として通す", async () => {
    vi.mocked(loadSkillMapSource).mockImplementation(async () => ({
      ...pathSource(),
      activeStageId: "stage-b",
      activeStageSource: "chosen" as const,
    }));
    const res = await start("stage-b");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { state: string }).state).toBe("active");
  });

  it("クリア済みの星は 400 (理由はそのまま返す)", async () => {
    vi.mocked(loadSkillMapSource).mockImplementation(async () => pathSource(["stage-a"]));
    const res = await start("stage-a");
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toContain("クリア済み");
    expect(startSelfEnrollment).not.toHaveBeenCalled();
  });

  it("ロック星は 400 で、見えている前提の名前を返す", async () => {
    const res = await start("stage-b");
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe("stage-a の講座 をクリアすると始められます");
    expect(startSelfEnrollment).not.toHaveBeenCalled();
  });

  it("前提が霧の中にあるロック星では、前提名をテーマ名に伏せる", async () => {
    // stage-c は name-only で見えているが、その前提 stage-deep は霧の中 (距離 3)。
    const res = await start("stage-c");
    expect(res.status).toBe(400);
    const message = await errorOf(res);
    // 見えている前提はそのまま、霧の前提はテーマ名に落ちる。
    expect(message).toContain("stage-b の講座");
    expect(message).not.toContain("stage-deep");
    expect(message).toContain("テーマX");
  });

  it("霧の星は汎用文言の 400 (存在しない星と区別しない)", async () => {
    const fog = await start("stage-far");
    const missing = await start("does-not-exist");
    expect(fog.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(await errorOf(fog)).toBe(await errorOf(missing));
    expect(startSelfEnrollment).not.toHaveBeenCalled();
  });

  it("霧の 400 はフォーカス切り替えの 400 と同じ文言", async () => {
    // 受講登録があっても霧の星は選べない (PUT 側の登録ゲートより先に進ませる)。
    enrolledIds.add("stage-far");
    const started = await start("stage-far");
    const focus = await app.request(
      "/api/skill-map/active-stage",
      {
        method: "PUT",
        headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: "stage-far" }),
      },
      env,
    );
    expect(focus.status).toBe(400);
    expect(await errorOf(started)).toBe(await errorOf(focus));
  });

  it("学習を見る側のロール (講師 / 営業) は 403", async () => {
    for (const role of ["instructor", "sales"] as const) {
      caller = { ...BASE_CALLER, role };
      const res = await start("stage-a");
      expect(res.status, role).toBe(403);
    }
    expect(startSelfEnrollment).not.toHaveBeenCalled();
  });

  it("管理者は受講者と同じく自分で始められる (腕試しと同じ顔ぶれ)", async () => {
    caller = { ...BASE_CALLER, role: "admin" };
    expect((await start("stage-a")).status).toBe(200);
  });

  it("登録を読み戻せなければ 500 (「始まった」と言わない)", async () => {
    vi.mocked(startSelfEnrollment).mockResolvedValueOnce({
      row: undefined,
      created: false,
      reactivated: false,
    });
    expect((await start("stage-a")).status).toBe(500);
  });
});
