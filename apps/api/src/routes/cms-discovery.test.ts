/**
 * Phase 4 — 発見教材の講師レビュー API (CMS) の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - staff だけが下書きを読める / 作れる (受講者は 403)
 *   - 生成は遅延で、鍵が無ければ heuristic (既存設問の複製) に落ちる
 *   - 生成物は必ず `draft` (自動承認しない)
 *   - **正答の無い設問がある教材は承認できない**
 *
 * D1 は `lib/discovery-data.js` を差し替え、ステージ表だけ薄い偽 db で代用する。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DiscoveryQuestion } from "@falcon/shared/discovery/types";

import type { Env } from "../env.js";
import { completeMessage } from "../lib/anthropic-complete.js";
import { recordAudit } from "../lib/audit.js";
import type { ProfileRole } from "../lib/authz.js";
import {
  insertDiscoveryMaterial,
  listDiscoveryMaterials,
  listDiscoveryRequests,
  loadDiscoveryMaterial,
  loadDiscoveryRequest,
  loadStageQuizQuestionsForCopy,
  updateDiscoveryMaterial,
} from "../lib/discovery-data.js";
import type { DiscoveryMaterialRow, NewDiscoveryMaterial } from "../lib/discovery-data.js";
import { cmsDiscoveryRoute } from "./cms-discovery.js";

vi.mock("../lib/discovery-data.js", () => ({
  listDiscoveryRequests: vi.fn(),
  listDiscoveryMaterials: vi.fn(),
  loadDiscoveryRequest: vi.fn(),
  loadDiscoveryMaterial: vi.fn(),
  insertDiscoveryMaterial: vi.fn(),
  updateDiscoveryMaterial: vi.fn(),
  loadStageQuizQuestionsForCopy: vi.fn(),
}));

vi.mock("../lib/anthropic-complete.js", () => ({ completeMessage: vi.fn() }));

vi.mock("../lib/audit.js", () => ({
  clientIp: () => null,
  recordAudit: vi.fn(async () => undefined),
}));

const BASE_CALLER = {
  id: "seed-instructor",
  tenantId: "ses",
  role: "instructor" as ProfileRole,
  name: "講師",
  email: null,
};

let caller: typeof BASE_CALLER;
/** ステージ表の中身 (偽 db が返す行)。 */
let stageRows: { id: string; title: string; canDo: string | null }[];

/**
 * ステージ表だけを返す薄い偽 db。
 *
 * 絞り込み (tenant / id) は SQL 側の仕事なので再現しない — このテストが見たいのは
 * 生成と承認の分岐であって、where 句の組み立てではない。
 *
 * Drizzle のクエリビルダは「チェーンでき、そのまま await もできる」形なので、
 * **本物の Promise にメソッドを生やす** ことで両方を満たす (自前の `then` を持つ
 * オブジェクトリテラルは thenable の落とし穴なので使わない)。
 */
function fakeDb(): unknown {
  const chain = Object.assign(Promise.resolve(stageRows), {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
  });
  return { select: () => chain };
}

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  return {
    ...actual,
    getCaller: vi.fn(async (c: { req: { header: (name: string) => string | undefined } }) => {
      const header = c.req.header("Authorization") ?? "";
      if (!header.startsWith("Bearer ")) {
        throw new actual.ApiError("Authorization ヘッダが必要です", 401);
      }
      return { caller, db: fakeDb() };
    }),
  };
});

const app = new Hono<{ Bindings: Env }>().route("/", cmsDiscoveryRoute);
let env: Env;

const request = (path: string, init?: RequestInit) =>
  app.request(
    path,
    {
      ...init,
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    },
    env,
  );

const post = (path: string, body: unknown = {}) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path: string, body: unknown) =>
  request(path, { method: "PATCH", body: JSON.stringify(body) });

function copyPool(count: number): DiscoveryQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `pool-q${i + 1}`,
    prompt: `既存の設問 ${i + 1}`,
    options: [
      { id: `pool-q${i + 1}o1`, label: "正しい", correct: true },
      { id: `pool-q${i + 1}o2`, label: "誤り", correct: false },
    ],
  }));
}

function materialRow(overrides: Partial<DiscoveryMaterialRow> = {}): DiscoveryMaterialRow {
  return {
    id: "m1",
    stageId: "id-b",
    title: "復習",
    description: "説明",
    questions: copyPool(2),
    source: "ai",
    generator: "heuristic",
    reviewStatus: "draft",
    unlockCondition: "stage_active_or_cleared",
    requestId: "req-1",
    createdAt: new Date("2026-08-20T00:00:00.000Z"),
    reviewedBy: null,
    reviewedAt: null,
    ...overrides,
  };
}

/** `insertDiscoveryMaterial` に渡された内容 (最後の 1 件)。 */
let inserted: NewDiscoveryMaterial | null;

beforeEach(() => {
  vi.clearAllMocks();
  caller = { ...BASE_CALLER };
  env = {} as Env;
  inserted = null;
  stageRows = [{ id: "id-b", title: "b の講座", canDo: "b ができる" }];

  vi.mocked(listDiscoveryRequests).mockResolvedValue([
    {
      id: "req-1",
      stageId: "id-b",
      topic: "確認テスト「配列」",
      origin: "quiz_fail",
      createdAt: new Date("2026-08-20T00:00:00.000Z"),
      materialCount: 0,
    },
  ]);
  vi.mocked(listDiscoveryMaterials).mockResolvedValue([materialRow()]);
  vi.mocked(loadDiscoveryRequest).mockResolvedValue({
    id: "req-1",
    stageId: "id-b",
    topic: "確認テスト「配列」",
    origin: "quiz_fail",
  });
  vi.mocked(loadDiscoveryMaterial).mockImplementation(async () => materialRow());
  vi.mocked(loadStageQuizQuestionsForCopy).mockResolvedValue(copyPool(8));
  vi.mocked(insertDiscoveryMaterial).mockImplementation(async (_db, input) => {
    inserted = input;
    return materialRow({
      title: input.title,
      description: input.description,
      questions: input.questions,
      generator: input.generator,
    });
  });
  vi.mocked(updateDiscoveryMaterial).mockImplementation(async (_db, _tenant, id, p) =>
    // 既定では競合していない前提 (比較交換の検証は専用のテストで行う)。
    materialRow({
      id,
      ...(p.title !== undefined ? { title: p.title } : {}),
      ...(p.questions !== undefined ? { questions: p.questions } : {}),
      ...(p.reviewStatus !== undefined ? { reviewStatus: p.reviewStatus } : {}),
      ...(p.reviewedBy !== undefined ? { reviewedBy: p.reviewedBy } : {}),
      ...(p.reviewedAt !== undefined ? { reviewedAt: p.reviewedAt } : {}),
    }),
  );
});

describe("認可", () => {
  it.each(["student", "sales"] as const)("%s は一覧も生成も 403", async (role) => {
    caller = { ...BASE_CALLER, role };
    expect((await request("/api/cms/discovery")).status).toBe(403);
    expect((await post("/api/cms/discovery/requests/req-1/generate")).status).toBe(403);
    expect((await patch("/api/cms/discovery/materials/m1", { title: "x" })).status).toBe(403);
    expect(insertDiscoveryMaterial).not.toHaveBeenCalled();
  });

  it("認証が無ければ 401", async () => {
    const res = await app.request("/api/cms/discovery", {}, env);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cms/discovery", () => {
  it("待ち行列と教材を、ステージ名つきで返す", async () => {
    const res = await request("/api/cms/discovery");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      requests: { id: string; stage_title: string | null; material_count: number }[];
      materials: { id: string; review_status: string; questions: unknown[] }[];
    };
    expect(body.requests[0]).toMatchObject({ id: "req-1", stage_title: "b の講座" });
    expect(body.materials[0]?.review_status).toBe("draft");
    // staff には正答つきで返す (レビューの本体)。
    expect(JSON.stringify(body.materials[0]?.questions)).toContain("correct");
  });

  it("生成済みかどうか (material_count) をそのまま渡す", async () => {
    // 画面はこの数で「未生成」を絞る。0 に潰れると待ち行列から行が消えなくなる。
    vi.mocked(listDiscoveryRequests).mockResolvedValue([
      {
        id: "req-1",
        stageId: "id-b",
        topic: "確認テスト「配列」",
        origin: "quiz_fail",
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
        materialCount: 2,
      },
    ]);
    const body = (await (await request("/api/cms/discovery")).json()) as {
      requests: { material_count: number }[];
    };
    expect(body.requests[0]?.material_count).toBe(2);
  });
});

describe("POST /api/cms/discovery/requests/:id/generate", () => {
  it("鍵が無ければ heuristic で既存設問を 5 問複製した draft を作る", async () => {
    const res = await post("/api/cms/discovery/requests/req-1/generate");
    expect(res.status).toBe(200);
    expect(completeMessage).not.toHaveBeenCalled();
    expect(inserted?.generator).toBe("heuristic");
    expect(inserted?.questions).toHaveLength(5);
    const body = (await res.json()) as { material: { review_status: string; generator: string } };
    // 生成は承認を兼ねない。
    expect(body.material.review_status).toBe("draft");
    expect(body.material.generator).toBe("heuristic");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      caller,
      expect.objectContaining({ action: "discovery_generate" }),
    );
  });

  it("同じリクエストからの生成は毎回同じ顔ぶれ (サンプリングは決定的)", async () => {
    await post("/api/cms/discovery/requests/req-1/generate");
    const first = inserted?.questions.map((q) => q.id);
    await post("/api/cms/discovery/requests/req-1/generate");
    expect(inserted?.questions.map((q) => q.id)).toEqual(first);
  });

  it("鍵があれば AI を呼び、応答を draft にする", async () => {
    env = { ANTHROPIC_API_KEY: "sk-test" } as Env;
    vi.mocked(completeMessage).mockResolvedValue(
      JSON.stringify({
        title: "配列メソッドの復習",
        description: "map と forEach の違い",
        questions: [
          {
            id: "g1",
            prompt: "新しい配列を返すのは?",
            options: [
              { id: "g1o1", label: "map", correct: true },
              { id: "g1o2", label: "forEach", correct: false },
            ],
          },
        ],
      }),
    );
    const res = await post("/api/cms/discovery/requests/req-1/generate");
    expect(res.status).toBe(200);
    expect(inserted?.generator).toBe("anthropic");
    expect(inserted?.title).toBe("配列メソッドの復習");
    expect(loadStageQuizQuestionsForCopy).not.toHaveBeenCalled();
  });

  it("AI が失敗しても heuristic に落ちて下書きは作る", async () => {
    env = { ANTHROPIC_API_KEY: "sk-test" } as Env;
    vi.mocked(completeMessage).mockRejectedValue(new Error("timeout"));
    const res = await post("/api/cms/discovery/requests/req-1/generate");
    expect(res.status).toBe(200);
    expect(inserted?.generator).toBe("heuristic");
  });

  it("AI の応答が JSON でなければ heuristic に落ちる", async () => {
    env = { ANTHROPIC_API_KEY: "sk-test" } as Env;
    vi.mocked(completeMessage).mockResolvedValue("作れませんでした");
    await post("/api/cms/discovery/requests/req-1/generate");
    expect(inserted?.generator).toBe("heuristic");
  });

  it("複製元の設問も無ければ 400 (空の下書きを置かない)", async () => {
    vi.mocked(loadStageQuizQuestionsForCopy).mockResolvedValue([]);
    const res = await post("/api/cms/discovery/requests/req-1/generate");
    expect(res.status).toBe(400);
    expect(insertDiscoveryMaterial).not.toHaveBeenCalled();
  });

  it("知らないリクエストは 404", async () => {
    vi.mocked(loadDiscoveryRequest).mockResolvedValue(null);
    expect((await post("/api/cms/discovery/requests/nope/generate")).status).toBe(404);
  });
});

describe("PATCH /api/cms/discovery/materials/:id", () => {
  it("承認するとレビュー者が記録される", async () => {
    const res = await patch("/api/cms/discovery/materials/m1", { review_status: "approved" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      material: { review_status: string; reviewed_by: string | null };
    };
    expect(body.material.review_status).toBe("approved");
    expect(body.material.reviewed_by).toBe(caller.id);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      caller,
      expect.objectContaining({ action: "discovery_review" }),
    );
  });

  it("正答の無い設問が残っていると承認できない", async () => {
    vi.mocked(loadDiscoveryMaterial).mockResolvedValue(
      materialRow({
        questions: [
          {
            id: "q1",
            prompt: "正答なし",
            options: [
              { id: "q1o1", label: "a", correct: false },
              { id: "q1o2", label: "b", correct: false },
            ],
          },
        ],
      }),
    );
    const res = await patch("/api/cms/discovery/materials/m1", { review_status: "approved" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain("正答");
    expect(updateDiscoveryMaterial).not.toHaveBeenCalled();
  });

  it("同じ PATCH で壊れた設問を送りながら承認することもできない", async () => {
    const res = await patch("/api/cms/discovery/materials/m1", {
      questions: [
        {
          prompt: "正答なし",
          options: [
            { label: "a", correct: false },
            { label: "b", correct: false },
          ],
        },
      ],
      review_status: "approved",
    });
    expect(res.status).toBe(400);
    expect(updateDiscoveryMaterial).not.toHaveBeenCalled();
  });

  it("設問は保存時に正規化する (選択肢 1 つの設問は落ちる)", async () => {
    await patch("/api/cms/discovery/materials/m1", {
      questions: [
        { prompt: "壊れた設問", options: [{ label: "a", correct: true }] },
        {
          prompt: "生きた設問",
          options: [
            { label: "a", correct: true },
            { label: "b", correct: false },
          ],
        },
      ],
    });
    const saved = vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[3].questions;
    expect(saved).toHaveLength(1);
    expect(saved?.[0]?.prompt).toBe("生きた設問");
  });

  it("下書きへ戻すとレビュー者の印を落とす", async () => {
    vi.mocked(loadDiscoveryMaterial).mockResolvedValue(
      materialRow({ reviewStatus: "approved", reviewedBy: "seed-admin" }),
    );
    await patch("/api/cms/discovery/materials/m1", { review_status: "draft" });
    expect(vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[3]).toMatchObject({
      reviewStatus: "draft",
      reviewedBy: null,
    });
  });

  it("不正な review_status は 400", async () => {
    expect(
      (await patch("/api/cms/discovery/materials/m1", { review_status: "published" })).status,
    ).toBe(400);
  });

  it("空タイトルは 400 (題名の無い教材を作らない)", async () => {
    expect((await patch("/api/cms/discovery/materials/m1", { title: "   " })).status).toBe(400);
  });

  it("知らない教材は 404", async () => {
    vi.mocked(loadDiscoveryMaterial).mockResolvedValue(null);
    expect((await patch("/api/cms/discovery/materials/nope", { title: "x" })).status).toBe(404);
  });

  it("設問は 20 問まで (それ以上は 400)", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      prompt: `問 ${i + 1}`,
      options: [
        { label: "a", correct: true },
        { label: "b", correct: false },
      ],
    }));
    const res = await patch("/api/cms/discovery/materials/m1", { questions: many });
    expect(res.status).toBe(400);
    expect(updateDiscoveryMaterial).not.toHaveBeenCalled();
  });

  it("内容を変えると discovery_material_edit を残す", async () => {
    await patch("/api/cms/discovery/materials/m1", { title: "直した題名" });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      caller,
      expect.objectContaining({
        action: "discovery_material_edit",
        metadata: expect.objectContaining({ fields: ["title"] }),
      }),
    );
  });

  it("値が変わらない再保存では何も書かない (承認も外れない)", async () => {
    const before = materialRow({ reviewStatus: "approved", reviewedBy: "seed-admin" });
    vi.mocked(loadDiscoveryMaterial).mockResolvedValue(before);
    const res = await patch("/api/cms/discovery/materials/m1", {
      title: before.title,
      description: before.description,
      questions: before.questions,
    });
    expect(res.status).toBe(200);
    expect(updateDiscoveryMaterial).not.toHaveBeenCalled();
    expect(((await res.json()) as { approval_revoked: boolean }).approval_revoked).toBe(false);
  });
});

/**
 * **承認済みのまま中身だけ差し替わる経路を残さない。**
 *
 * 承認は中身に対する判断なので、中身が変われば判断も無効になる。ここで固定するのは
 * 「approved のまま残ろうとする経路が無い」ことと、「approved で残るのは正答チェックを
 * 通ったときだけ」の 2 点。
 */
describe("PATCH — 承認と編集が競合したとき", () => {
  const approved = () =>
    materialRow({ reviewStatus: "approved", reviewedBy: "seed-admin", reviewedAt: new Date() });

  it("読んだ状態を更新条件に渡す (他の staff の編集が先に着いたら 409)", async () => {
    vi.mocked(loadDiscoveryMaterial).mockImplementation(async () => approved());
    // 別の staff の編集が先に着いて approved → draft に落ちた状態 = 0 件更新。
    vi.mocked(updateDiscoveryMaterial).mockResolvedValueOnce(null);

    const res = await patch("/api/cms/discovery/materials/m1", { review_status: "approved" });
    expect(res.status).toBe(409);
    // 読んだときの状態が更新条件として渡っている (これが無いと上書きで承認が通る)。
    expect(vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[4]).toBe("approved");
  });

  it("承認は検証した設問そのものを書く (設問を送らない承認でも)", async () => {
    const pool = copyPool(3);
    vi.mocked(loadDiscoveryMaterial).mockImplementation(async () =>
      materialRow({ reviewStatus: "draft", questions: pool }),
    );

    const res = await patch("/api/cms/discovery/materials/m1", { review_status: "approved" });
    expect(res.status).toBe(200);
    // 検証した設問が patch に載る = 読んだあとに差し替えられた設問が承認されない。
    expect(vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[3].questions).toEqual(pool);
  });
});

describe("PATCH — 承認済みの再編集", () => {
  const approved = () =>
    materialRow({ reviewStatus: "approved", reviewedBy: "seed-admin", reviewedAt: new Date() });

  beforeEach(() => {
    vi.mocked(loadDiscoveryMaterial).mockImplementation(async () => approved());
  });

  it.each([
    ["questions", { questions: copyPool(3) }],
    ["title", { title: "別の題名" }],
    ["description", { description: "別の説明" }],
  ])("承認済みの %s を変えると draft に落ちる (再承認が要る)", async (_field, body) => {
    const res = await patch("/api/cms/discovery/materials/m1", body);
    expect(res.status).toBe(200);
    const saved = vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[3];
    expect(saved).toMatchObject({ reviewStatus: "draft", reviewedBy: null, reviewedAt: null });
    const payload = (await res.json()) as {
      material: { review_status: string };
      approval_revoked: boolean;
    };
    expect(payload.material.review_status).toBe("draft");
    // 画面が「内容を変更したため再承認が必要です」を出せるように、理由を返す。
    expect(payload.approval_revoked).toBe(true);
  });

  it("承認が外れたことは監査にも残る (編集 + レビューの 2 行)", async () => {
    await patch("/api/cms/discovery/materials/m1", { questions: copyPool(3) });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      caller,
      expect.objectContaining({
        action: "discovery_material_edit",
        metadata: expect.objectContaining({ approval_revoked: true }),
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      caller,
      expect.objectContaining({
        action: "discovery_review",
        metadata: expect.objectContaining({ to: "draft", reason: "content_edited" }),
      }),
    );
  });

  it("正答の無い設問へ差し替えても approved のままにはならない", async () => {
    const broken = [
      {
        prompt: "正答なし",
        options: [
          { label: "a", correct: false },
          { label: "b", correct: false },
        ],
      },
    ];
    const res = await patch("/api/cms/discovery/materials/m1", { questions: broken });
    expect(res.status).toBe(200);
    // 承認チェックを迂回して「approved のまま壊れた設問が入る」ことが無い。
    expect(vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[3].reviewStatus).toBe("draft");
  });

  it("承認のまま残せるのは、明示的に承認を送り直して正答チェックを通したときだけ", async () => {
    // 壊れた設問 + 明示的な承認 → 400 (書き込みも起きない)。
    const broken = await patch("/api/cms/discovery/materials/m1", {
      questions: [
        {
          prompt: "正答なし",
          options: [
            { label: "a", correct: false },
            { label: "b", correct: false },
          ],
        },
      ],
      review_status: "approved",
    });
    expect(broken.status).toBe(400);
    expect(updateDiscoveryMaterial).not.toHaveBeenCalled();

    // 正しい設問 + 明示的な承認 → approved のまま (再承認)。
    const ok = await patch("/api/cms/discovery/materials/m1", {
      questions: copyPool(3),
      review_status: "approved",
    });
    expect(ok.status).toBe(200);
    expect(vi.mocked(updateDiscoveryMaterial).mock.calls[0]?.[3]).toMatchObject({
      reviewStatus: "approved",
      reviewedBy: caller.id,
    });
    expect(((await ok.json()) as { approval_revoked: boolean }).approval_revoked).toBe(false);
  });

  it("本文を変えなければ承認は外れない (却下などの状態変更だけ)", async () => {
    const res = await patch("/api/cms/discovery/materials/m1", { review_status: "rejected" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { approval_revoked: boolean }).approval_revoked).toBe(false);
  });
});
