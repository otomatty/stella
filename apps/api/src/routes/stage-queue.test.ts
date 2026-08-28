/**
 * Phase 2 — 「次にやるリスト」(ステージのキュー) と学習フォーカスの route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 認証されていなければ通さない / 触れるのは本人のキューだけ
 *   - 受講登録のないステージは積めない・フォーカスにできない
 *   - 並びが 0..n-1 で保存され、次の GET に反映される
 *
 * D1 は `lib/stage-queue-data.js` / `lib/skill-map-data.js` を差し替えて
 * インメモリの配列で代用する (skill-map.test.ts と同じ流儀)。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { ApiError } from "../lib/authz.js";
import {
  loadEnrolledStageIds,
  loadFocusCompletions,
  loadSkillMapSource,
  loadSkillProfileCounts,
  loadStudyDays,
  saveFocusStageId,
} from "../lib/skill-map-data.js";
import {
  deleteStageQueueEntry,
  insertStageQueueEntry,
  isEnrolledInStage,
  loadStageQueue,
  setStageQueueOrder,
  type StageQueueEntry,
} from "../lib/stage-queue-data.js";
import { skillMapRoute } from "./skill-map.js";
import { stageQueueRoute } from "./stage-queue.js";

vi.mock("../lib/stage-queue-data.js", () => ({
  loadStageQueue: vi.fn(),
  insertStageQueueEntry: vi.fn(),
  deleteStageQueueEntry: vi.fn(),
  setStageQueueOrder: vi.fn(),
  isEnrolledInStage: vi.fn(),
}));

vi.mock("../lib/skill-map-data.js", () => ({
  loadSkillMapSource: vi.fn(),
  loadSkillProfileCounts: vi.fn(),
  loadStudyDays: vi.fn(),
  loadEnrolledStageIds: vi.fn(),
  loadFocusCompletions: vi.fn(),
  saveFocusStageId: vi.fn(),
}));

/** 呼び出し中の caller (テストごとに差し替えて「他人」を作る)。 */
let caller = { id: "seed-learner", tenantId: "ses", role: "student", name: "受講者", email: null };

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

const app = new Hono<{ Bindings: Env }>().route("/", stageQueueRoute).route("/", skillMapRoute);
const env = {} as Env;

const ENROLLED = new Set(["stage-a", "stage-b", "stage-c"]);

/**
 * フォーカスの受け入れ判定が見る道。一本道 a → b → c → far → fog で、id = slug。
 *
 * 起点 (前提なし = unlocked) は a なので、視界は a/b が full・c が name-only・
 * far と fog は霧。**受講登録があっても霧の中にある星** (fog) を作れるようにして
 * あるのは、PUT がそれを弾くことを見るため。
 */
function pathSource() {
  const stage = (slug: string, prerequisites: string[]) => ({
    id: slug,
    slug,
    title: `${slug} の講座`,
    prerequisites,
    category: "プログラミング",
    theme: "テーマ",
  });
  return {
    stages: [
      stage("stage-a", []),
      stage("stage-b", ["stage-a"]),
      stage("stage-c", ["stage-b"]),
      stage("stage-far", ["stage-c"]),
      stage("stage-fog", ["stage-far"]),
    ],
    clearedStageIds: new Set<string>(),
    enrolledStageIds: new Set(ENROLLED),
  };
}

/** ユーザーごとのキュー (本人以外の行が混ざらないことを確かめるため id で分ける)。 */
let queues: Map<string, StageQueueEntry[]>;

function queueOf(userId: string): StageQueueEntry[] {
  const rows = queues.get(userId) ?? [];
  queues.set(userId, rows);
  return rows;
}

function request(path: string, init: RequestInit & { auth?: boolean } = {}) {
  const { auth = true, ...rest } = init;
  return app.request(
    path,
    {
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(auth ? { Authorization: "Bearer test" } : {}),
      },
    },
    env,
  );
}

const json = (body: unknown) => JSON.stringify(body);

async function queueIds(): Promise<string[]> {
  const res = await request("/api/stage-queue/mine");
  expect(res.status).toBe(200);
  const body = (await res.json()) as { stage_queue: { stage_id: string; order: number }[] };
  // order は必ず 0..n-1 の連番で返る。
  expect(body.stage_queue.map((row) => row.order)).toEqual(body.stage_queue.map((_, i) => i));
  return body.stage_queue.map((row) => row.stage_id);
}

beforeEach(() => {
  // 呼び出し回数を見るアサーション (saveFocusStageId) が前のテストを引きずらないように。
  vi.clearAllMocks();
  caller = { id: "seed-learner", tenantId: "ses", role: "student", name: "受講者", email: null };
  queues = new Map();

  vi.mocked(loadStageQueue).mockImplementation(async (_db, c) =>
    [...queueOf(c.id)].sort(
      (a, b) => a.order - b.order || a.addedAt.getTime() - b.addedAt.getTime(),
    ),
  );
  vi.mocked(insertStageQueueEntry).mockImplementation(async (_db, c, stageId, order) => {
    const rows = queueOf(c.id);
    if (rows.some((row) => row.stageId === stageId)) return;
    rows.push({ stageId, order, addedAt: new Date(2026, 0, 1, 0, rows.length) });
  });
  vi.mocked(deleteStageQueueEntry).mockImplementation(async (_db, c, stageId) => {
    queues.set(
      c.id,
      queueOf(c.id).filter((row) => row.stageId !== stageId),
    );
  });
  vi.mocked(setStageQueueOrder).mockImplementation(async (_db, c, stageIds) => {
    for (const row of queueOf(c.id)) {
      const next = stageIds.indexOf(row.stageId);
      if (next !== -1) row.order = next;
    }
  });
  vi.mocked(isEnrolledInStage).mockImplementation(async (_db, _c, stageId) =>
    ENROLLED.has(stageId),
  );

  vi.mocked(loadEnrolledStageIds).mockResolvedValue(new Set(ENROLLED));
  vi.mocked(saveFocusStageId).mockResolvedValue(undefined);
  vi.mocked(loadFocusCompletions).mockResolvedValue([]);
  vi.mocked(loadStudyDays).mockResolvedValue([]);
  vi.mocked(loadSkillProfileCounts).mockResolvedValue({
    completedLessons: 0,
    passedQuizzes: 0,
    clearedStages: 0,
  });
  vi.mocked(loadSkillMapSource).mockResolvedValue(pathSource());
});

describe("GET /api/stage-queue/mine", () => {
  it("認証が無ければ 401", async () => {
    const res = await request("/api/stage-queue/mine", { auth: false });
    expect(res.status).toBe(401);
  });

  it("最初は空", async () => {
    expect(await queueIds()).toEqual([]);
  });

  it("他人のキューは混ざらない", async () => {
    await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId: "stage-a" }) });
    caller = { ...caller, id: "other-learner" };
    expect(await queueIds()).toEqual([]);
  });

  it("staff も見えるのは自分のキューだけ (他人のキューを覗く口は無い)", async () => {
    await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId: "stage-a" }) });
    caller = { ...caller, id: "seed-instructor", role: "instructor" };
    expect(await queueIds()).toEqual([]);
  });
});

describe("POST /api/stage-queue/mine", () => {
  it("末尾に積まれる", async () => {
    for (const stageId of ["stage-a", "stage-b", "stage-c"]) {
      const res = await request("/api/stage-queue/mine", {
        method: "POST",
        body: json({ stageId }),
      });
      expect(res.status).toBe(200);
    }
    expect(await queueIds()).toEqual(["stage-a", "stage-b", "stage-c"]);
  });

  it("受講登録の無いステージは 400 (存在しない id と区別しない)", async () => {
    const res = await request("/api/stage-queue/mine", {
      method: "POST",
      body: json({ stageId: "stage-not-mine" }),
    });
    expect(res.status).toBe(400);
    expect(await queueIds()).toEqual([]);
  });

  it("stageId が無ければ 400", async () => {
    const res = await request("/api/stage-queue/mine", { method: "POST", body: json({}) });
    expect(res.status).toBe(400);
  });

  it("二重追加しても増えない (成功扱い)", async () => {
    await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId: "stage-a" }) });
    const res = await request("/api/stage-queue/mine", {
      method: "POST",
      body: json({ stageId: "stage-a" }),
    });
    expect(res.status).toBe(200);
    expect(await queueIds()).toEqual(["stage-a"]);
  });

  it("認証が無ければ 401", async () => {
    const res = await request("/api/stage-queue/mine", {
      method: "POST",
      body: json({ stageId: "stage-a" }),
      auth: false,
    });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/stage-queue/mine/order", () => {
  beforeEach(async () => {
    for (const stageId of ["stage-a", "stage-b", "stage-c"]) {
      await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId }) });
    }
  });

  it("並べ替えが次の取得に残る", async () => {
    const res = await request("/api/stage-queue/mine/order", {
      method: "PUT",
      body: json({ stageIds: ["stage-c", "stage-a", "stage-b"] }),
    });
    expect(res.status).toBe(200);
    expect(await queueIds()).toEqual(["stage-c", "stage-a", "stage-b"]);
  });

  it("payload に無い行は落とさず末尾に残す", async () => {
    await request("/api/stage-queue/mine/order", {
      method: "PUT",
      body: json({ stageIds: ["stage-c"] }),
    });
    expect(await queueIds()).toEqual(["stage-c", "stage-a", "stage-b"]);
  });

  it("キューに無いステージを混ぜたら 400", async () => {
    const res = await request("/api/stage-queue/mine/order", {
      method: "PUT",
      body: json({ stageIds: ["stage-a", "stage-not-queued"] }),
    });
    expect(res.status).toBe(400);
    expect(await queueIds()).toEqual(["stage-a", "stage-b", "stage-c"]);
  });

  it("配列でなければ 400", async () => {
    const res = await request("/api/stage-queue/mine/order", {
      method: "PUT",
      body: json({ stageIds: "stage-a" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/stage-queue/mine/:stageId", () => {
  it("削除すると詰め直される", async () => {
    for (const stageId of ["stage-a", "stage-b", "stage-c"]) {
      await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId }) });
    }
    const res = await request("/api/stage-queue/mine/stage-a", { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await queueIds()).toEqual(["stage-b", "stage-c"]);
  });

  it("無い行を消しても 200 (冪等)", async () => {
    const res = await request("/api/stage-queue/mine/stage-a", { method: "DELETE" });
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/skill-map/active-stage", () => {
  it("認証が無ければ 401", async () => {
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-a" }),
      auth: false,
    });
    expect(res.status).toBe(401);
  });

  it("受講登録のあるステージなら保存される", async () => {
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-a" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ active_stage_id: "stage-a" });
    expect(saveFocusStageId).toHaveBeenCalledWith({}, expect.anything(), "stage-a");
  });

  it("受講登録の無いステージは 400 で保存しない", async () => {
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-not-mine" }),
    });
    expect(res.status).toBe(400);
    expect(saveFocusStageId).not.toHaveBeenCalled();
  });

  it("null はフォーカス解除として受け付ける", async () => {
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: null }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ active_stage_id: null });
    expect(saveFocusStageId).toHaveBeenCalledWith({}, expect.anything(), null);
  });

  it("解除は道を評価せずに通す (現在地を見失っていても外せる)", async () => {
    // 迷子になったフォーカスを外すのが目的なので、評価器の判定に巻き込まれない。
    vi.mocked(loadSkillMapSource).mockRejectedValue(new Error("読めない"));
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: null }),
    });
    expect(res.status).toBe(200);
    expect(saveFocusStageId).toHaveBeenCalledWith({}, expect.anything(), null);
  });

  it("クリア済みのステージは 400 で保存しない", async () => {
    // 読み出し側 (resolveActiveStage) はクリア済みのフォーカスを導出へ落とすので、
    // 保存を許すと「保存したのに反映されない」書き込みになる。
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...pathSource(),
      clearedStageIds: new Set(["stage-a"]),
    });
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-a" }),
    });
    expect(res.status).toBe(400);
    expect(saveFocusStageId).not.toHaveBeenCalled();
  });

  it("霧の中のステージは、受講登録があっても 400 で保存しない", async () => {
    // 自分で active にすると隣接まで full になり、視界制限を操作で外せてしまう。
    vi.mocked(loadEnrolledStageIds).mockResolvedValue(new Set([...ENROLLED, "stage-fog"]));
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-fog" }),
    });
    expect(res.status).toBe(400);
    expect(saveFocusStageId).not.toHaveBeenCalled();
  });

  it("霧の 400 は未受講の 400 と同じ文言 (割当の有無を漏らさない)", async () => {
    vi.mocked(loadEnrolledStageIds).mockResolvedValue(new Set([...ENROLLED, "stage-fog"]));
    const fog = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-fog" }),
    });
    const unknown = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-not-mine" }),
    });
    expect(fog.status).toBe(unknown.status);
    expect(await fog.json()).toEqual(await unknown.json());
  });

  it("道に載っていないステージも 400 (公開されていない星をフォーカスにしない)", async () => {
    vi.mocked(loadEnrolledStageIds).mockResolvedValue(new Set([...ENROLLED, "stage-unpublished"]));
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-unpublished" }),
    });
    expect(res.status).toBe(400);
    expect(saveFocusStageId).not.toHaveBeenCalled();
  });

  it("stageId が無ければ 400", async () => {
    const res = await request("/api/skill-map/active-stage", { method: "PUT", body: json({}) });
    expect(res.status).toBe(400);
  });

  it("フォーカスにした星はキューから外れる", async () => {
    await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId: "stage-a" }) });
    await request("/api/stage-queue/mine", { method: "POST", body: json({ stageId: "stage-b" }) });
    await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-a" }),
    });
    expect(await queueIds()).toEqual(["stage-b"]);
  });

  it("読み出しが落ちたらエラー応答にする", async () => {
    vi.mocked(loadEnrolledStageIds).mockRejectedValue(
      new ApiError("プロフィールが見つかりません", 403),
    );
    const res = await request("/api/skill-map/active-stage", {
      method: "PUT",
      body: json({ stageId: "stage-a" }),
    });
    expect(res.status).toBe(403);
  });
});
