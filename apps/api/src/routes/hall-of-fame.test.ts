/**
 * Phase 5 — 殿堂 (Hall of Fame) の route テスト。
 *
 * 見ているのは **API 境界の責務** だけ:
 *   - 状態遷移が推薦 → 申請 → 公開の一方通行で、飛ばす経路も戻す経路も無いこと
 *   - **本人の同意なく公開になる経路が存在しない**こと (推薦から直接公開できない /
 *     辞退した行は公開できない / 他人の行を書けない)
 *   - 公開されていない掲載は存在ごと 404 で、公開読み出しにも出ないこと
 *   - 監査に残るのは推薦・申請・公開・非公開化だけで、**辞退と取り下げは残らない**こと
 *
 * D1 は `lib/hall-of-fame-data.js` / `lib/skill-map-data.js` を差し替えたインメモリの
 * 掲載で代用する (discovery.test.ts と同じ流儀)。
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HallOfFameChapters, HallOfFameStatus } from "@falcon/shared/hall-of-fame/types";
import { EMPTY_HOF_CHAPTERS } from "@falcon/shared/hall-of-fame/types";

import type { Env } from "../env.js";
import type { ProfileRole } from "../lib/authz.js";
import { recordAudit } from "../lib/audit.js";
import {
  buildPathSnapshot,
  insertNomination,
  listAllEntries,
  listNominationCandidates,
  listPublishedEntries,
  loadEntryById,
  loadEntryByUser,
  loadNominationTarget,
  updateEntry,
} from "../lib/hall-of-fame-data.js";
import type { HallOfFameRow, HallOfFameRowWithProfile } from "../lib/hall-of-fame-data.js";
import { loadSkillMapSource } from "../lib/skill-map-data.js";
import { cmsHallOfFameRoute } from "./cms-hall-of-fame.js";
import { hallOfFameRoute } from "./hall-of-fame.js";

vi.mock("../lib/hall-of-fame-data.js", () => ({
  loadEntryByUser: vi.fn(),
  loadEntryById: vi.fn(),
  listPublishedEntries: vi.fn(),
  listAllEntries: vi.fn(),
  listNominationCandidates: vi.fn(),
  loadNominationTarget: vi.fn(),
  insertNomination: vi.fn(),
  updateEntry: vi.fn(),
  buildPathSnapshot: vi.fn(),
}));

vi.mock("../lib/skill-map-data.js", () => ({
  loadSkillMapSource: vi.fn(),
}));

vi.mock("../lib/audit.js", () => ({
  recordAudit: vi.fn(),
  clientIp: vi.fn(() => null),
}));

const LEARNER = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student" as ProfileRole,
  name: "受講者",
  email: null,
};
const LEARNER2 = { ...LEARNER, id: "seed-learner2", name: "受講者2" };
const ADMIN = { ...LEARNER, id: "seed-admin", role: "admin" as ProfileRole, name: "管理者" };
const INSTRUCTOR = {
  ...LEARNER,
  id: "seed-instructor",
  role: "instructor" as ProfileRole,
  name: "講師",
};

let caller: typeof LEARNER;

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

const app = new Hono<{ Bindings: Env }>()
  .route("/", hallOfFameRoute)
  .route("/", cmsHallOfFameRoute);
const env = {} as Env;

const get = (path: string, auth = true) =>
  app.request(path, auth ? { headers: { Authorization: "Bearer test" } } : {}, env);

const send = (method: "POST" | "PUT", path: string, body: unknown = {}) =>
  app.request(
    path,
    {
      method,
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );

const FULL_CHAPTERS: HallOfFameChapters = {
  orderReason: "動くものを自分で作りたかった",
  struggle: "型が合わない日が続いた",
  currentWork: "社内の受発注システムを直している",
  message: "手を止めない日を作るだけでいい",
};

const FULL_CONTENT = {
  job_title: "夜間バッチの番人",
  quote: "動かないコードの前で粘れる人になった。",
  chapters: FULL_CHAPTERS,
};

interface StoreRow extends HallOfFameRow {
  tenantId: string;
  displayName: string;
}

/** インメモリの掲載台帳 (id 引き)。 */
let store: Map<string, StoreRow>;
/** プロフィール (推薦の可否判定に使う)。 */
let people: Map<string, { id: string; role: string; disabled: boolean; name: string }>;

function makeRow(
  id: string,
  userId: string,
  status: HallOfFameStatus,
  overrides: Partial<StoreRow> = {},
): StoreRow {
  return {
    id,
    tenantId: "ses",
    userId,
    displayName: people.get(userId)?.name ?? userId,
    status,
    jobTitle: "",
    quote: "",
    chapters: { ...EMPTY_HOF_CHAPTERS },
    pathSnapshot: [],
    nominatedBy: "seed-admin",
    nominatedAt: new Date("2026-08-01T00:00:00.000Z"),
    submittedAt: null,
    publishedAt: null,
    publishedBy: null,
    closedAt: null,
    ...overrides,
  };
}

function withProfile(row: StoreRow): HallOfFameRowWithProfile {
  return { ...row, displayName: row.displayName, initials: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  caller = { ...LEARNER };
  store = new Map();
  people = new Map([
    ["seed-learner", { id: "seed-learner", role: "student", disabled: false, name: "受講者" }],
    ["seed-learner2", { id: "seed-learner2", role: "student", disabled: false, name: "受講者2" }],
    [
      "seed-instructor",
      { id: "seed-instructor", role: "instructor", disabled: false, name: "講師" },
    ],
  ]);

  vi.mocked(loadEntryByUser).mockImplementation(async (_db, tenantId, userId) => {
    const row = [...store.values()].find((r) => r.tenantId === tenantId && r.userId === userId);
    return row ?? null;
  });
  vi.mocked(loadEntryById).mockImplementation(async (_db, tenantId, id) => {
    const row = store.get(id);
    return row && row.tenantId === tenantId ? withProfile(row) : null;
  });
  vi.mocked(listPublishedEntries).mockImplementation(async (_db, tenantId) =>
    [...store.values()]
      .filter((row) => row.tenantId === tenantId && row.status === "published")
      .map(withProfile),
  );
  vi.mocked(listAllEntries).mockImplementation(async (_db, tenantId) =>
    [...store.values()].filter((row) => row.tenantId === tenantId).map(withProfile),
  );
  vi.mocked(listNominationCandidates).mockImplementation(async (_db, _tenantId, role) =>
    [...people.values()]
      .filter(
        (p) =>
          p.role === role && !p.disabled && ![...store.values()].some((row) => row.userId === p.id),
      )
      .map((p) => ({ id: p.id, name: p.name, email: null })),
  );
  vi.mocked(loadNominationTarget).mockImplementation(async (_db, _tenantId, userId) => {
    const person = people.get(userId);
    return person ? { id: person.id, role: person.role, disabled: person.disabled } : null;
  });
  vi.mocked(insertNomination).mockImplementation(async (_db, input) => {
    const row = makeRow(`hof-${input.userId}`, input.userId, "nominated", {
      tenantId: input.tenantId,
      nominatedBy: input.nominatedBy,
    });
    store.set(row.id, row);
    return row;
  });
  vi.mocked(updateEntry).mockImplementation(
    async (_db, tenantId, id, expectedStatus, patch, expectedSubmittedAt) => {
      const row = store.get(id);
      // 本物と同じく「今の状態が想定どおりのときだけ書ける」(競合は 0 件更新)。
      if (!row || row.tenantId !== tenantId || row.status !== expectedStatus) return null;
      // 版まで渡されたら比較交換 (公開は「読んだ版」だけを書ける)。
      if (expectedSubmittedAt && row.submittedAt?.getTime() !== expectedSubmittedAt.getTime()) {
        return null;
      }
      const next: StoreRow = { ...row, ...patch };
      store.set(id, next);
      return next;
    },
  );
  vi.mocked(buildPathSnapshot).mockResolvedValue([
    { id: "id-a", title: "HTML/CSS 入門研修" },
    { id: "id-b", title: "JavaScript 入門研修" },
    { id: "id-c", title: "TypeScript 入門研修" },
    { id: "id-d", title: "SQL 入門研修" },
  ]);
  // 閲覧者の道: a はクリア済み、b が進行中、c は開いている、d はロック。
  vi.mocked(loadSkillMapSource).mockImplementation(async () => ({
    stages: [
      { id: "id-a", slug: "a", title: "HTML/CSS 入門研修", prerequisites: [], category: "web" },
      {
        id: "id-b",
        slug: "b",
        title: "JavaScript 入門研修",
        prerequisites: ["a"],
        category: "web",
      },
      {
        id: "id-c",
        slug: "c",
        title: "TypeScript 入門研修",
        prerequisites: ["a"],
        category: "web",
      },
      { id: "id-d", slug: "d", title: "SQL 入門研修", prerequisites: ["c"], category: "db" },
    ],
    clearedStageIds: new Set(["id-a"]),
    activeStageId: "id-b",
    activeStageSource: "chosen" as const,
    enrolledStageIds: new Set(["id-a", "id-b"]),
    unlockedStageIds: new Set<string>(),
  }));
});

/** 推薦 → 記入 → 申請 までを通す (公開の一歩手前)。 */
async function submitEntry(
  userId = "seed-learner",
): Promise<{ entryId: string; submittedAt: string }> {
  caller = { ...ADMIN };
  const nominated = await send("POST", "/api/cms/hall-of-fame/nominate", { userId });
  expect(nominated.status).toBe(200);
  const entryId = ((await nominated.json()) as { entry: { id: string } }).entry.id;

  caller = { ...LEARNER, id: userId, name: people.get(userId)?.name ?? userId };
  const submitted = await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: true });
  expect(submitted.status).toBe(200);
  const submittedAt = ((await submitted.json()) as { entry: { submitted_at: string } }).entry
    .submitted_at;
  return { entryId, submittedAt };
}

/** 推薦 → 記入 → 申請 → 公開までを通す (テストの下ごしらえ)。 */
async function publishEntry(userId = "seed-learner"): Promise<string> {
  const { entryId, submittedAt } = await submitEntry(userId);
  caller = { ...ADMIN };
  expect(
    (
      await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`, {
        expected_submitted_at: submittedAt,
      })
    ).status,
  ).toBe(200);
  return entryId;
}

const auditActions = () => vi.mocked(recordAudit).mock.calls.map((call) => call[2]?.action);

describe("推薦 (admin だけ / 受講者だけ)", () => {
  it("管理者は受講者を推薦でき、招待が nominated で作られる", async () => {
    caller = { ...ADMIN };
    const res = await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entry: { status: string; name: string } };
    expect(body.entry.status).toBe("nominated");
    expect(auditActions()).toEqual(["hof_nominate"]);
  });

  it("同じ受講者を二度推薦できない (409)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    const res = await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    expect(res.status).toBe(409);
  });

  it("受講者以外は推薦できない (400)", async () => {
    caller = { ...ADMIN };
    const res = await send("POST", "/api/cms/hall-of-fame/nominate", {
      userId: "seed-instructor",
    });
    expect(res.status).toBe(400);
  });

  it("存在しないユーザーは 404", async () => {
    caller = { ...ADMIN };
    expect(
      (await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "nobody" })).status,
    ).toBe(404);
  });

  it.each(["instructor", "sales", "student"] as const)(
    "%s は運営 API に触れない (403)",
    async (role) => {
      caller = { ...LEARNER, id: `seed-${role}`, role };
      expect((await get("/api/cms/hall-of-fame")).status).toBe(403);
      expect(
        (await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" })).status,
      ).toBe(403);
      expect(insertNomination).not.toHaveBeenCalled();
    },
  );

  it("推薦の候補には、まだ招待していない受講者だけが並ぶ", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    const body = (await (await get("/api/cms/hall-of-fame")).json()) as {
      candidates: { id: string }[];
    };
    expect(body.candidates.map((row) => row.id)).toEqual(["seed-learner2"]);
  });
});

describe("本人の記入と申請", () => {
  beforeEach(async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    caller = { ...LEARNER };
    vi.mocked(recordAudit).mockClear();
  });

  it("招待は本人に見える (nominated のまま)", async () => {
    const body = (await (await get("/api/hall-of-fame/mine")).json()) as {
      entry: { status: string } | null;
    };
    expect(body.entry?.status).toBe("nominated");
  });

  it("招待の無い人には entry: null を返す (404 にしない)", async () => {
    caller = { ...LEARNER2 };
    const body = (await (await get("/api/hall-of-fame/mine")).json()) as { entry: null };
    expect(body.entry).toBeNull();
  });

  it("下書き保存では状態が変わらず、監査にも残らない", async () => {
    const res = await send("PUT", "/api/hall-of-fame/mine", { job_title: "書きかけ" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entry: { status: string; job_title: string } };
    expect(body.entry.status).toBe("nominated");
    expect(body.entry.job_title).toBe("書きかけ");
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("未記入のまま申請できない (400 で足りない項目を返す)", async () => {
    const res = await send("PUT", "/api/hall-of-fame/mine", {
      job_title: "番人",
      submit: true,
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain("引用");
    expect(store.get("hof-seed-learner")?.status).toBe("nominated");
  });

  it("全部埋めて申請すると submitted になり、同意として監査に残る", async () => {
    const res = await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: true });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { entry: { status: string } }).entry.status).toBe("submitted");
    expect(auditActions()).toEqual(["hof_submit"]);
  });

  it("他人の掲載 id を送った PUT は 403 (自分の行も書き換わらない)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner2" });
    caller = { ...LEARNER };
    const res = await send("PUT", "/api/hall-of-fame/mine", {
      id: "hof-seed-learner2",
      job_title: "乗っ取り",
    });
    expect(res.status).toBe(403);
    expect(store.get("hof-seed-learner")?.jobTitle).toBe("");
    expect(store.get("hof-seed-learner2")?.jobTitle).toBe("");
  });

  it("招待の無い人は書けない (404)", async () => {
    caller = { ...LEARNER2 };
    expect((await send("PUT", "/api/hall-of-fame/mine", FULL_CONTENT)).status).toBe(404);
  });

  it("認証が無ければ 401", async () => {
    expect((await get("/api/hall-of-fame/mine", false)).status).toBe(401);
  });
});

describe("公開 (管理者 / submitted からだけ)", () => {
  it("推薦しただけの行は公開できない (400)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    const res = await send("POST", "/api/cms/hall-of-fame/hof-seed-learner/publish", {
      expected_submitted_at: "2026-08-01T00:00:00.000Z",
    });
    expect(res.status).toBe(400);
    expect(store.get("hof-seed-learner")?.status).toBe("nominated");
  });

  it("取り下げた行は公開できない (400)", async () => {
    const id = await publishEntry();
    const submittedAt = store.get(id)?.submittedAt?.toISOString() ?? "";
    caller = { ...LEARNER };
    expect((await send("POST", "/api/hall-of-fame/mine/withdraw")).status).toBe(200);

    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${id}/publish`, {
      expected_submitted_at: submittedAt,
    });
    expect(res.status).toBe(400);
    expect(store.get(id)?.status).toBe("withdrawn");
    expect(((await (await get("/api/hall-of-fame")).json()) as { entries: [] }).entries).toEqual(
      [],
    );
  });

  it("expected_submitted_at が無い publish は 400 (読んだ版を必ず添える)", async () => {
    const { entryId } = await submitEntry();
    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`);
    expect(res.status).toBe(400);
    expect(store.get(entryId)?.status).toBe("submitted");
  });

  it("読んだあとに本人が出し直していたら公開できない (409)", async () => {
    // 申請と再申請が同じミリ秒に落ちないよう時計を進める (実運用では別の時刻)。
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
    const { entryId, submittedAt } = await submitEntry();

    // 管理者が読んだあと、本人が書き直して出し直す (submitted_at が進む)。
    vi.setSystemTime(new Date("2026-08-20T10:05:00.000Z"));
    caller = { ...LEARNER };
    await send("PUT", "/api/hall-of-fame/mine", {
      ...FULL_CONTENT,
      quote: "書き直したあとの引用。",
      submit: true,
    });
    vi.useRealTimers();

    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`, {
      expected_submitted_at: submittedAt,
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toContain("読み直して");
    expect(store.get(entryId)?.status).toBe("submitted");
  });

  it("申請済みのまま下書き保存で本文を書き換えても、読んだ版では公開できない (409)", async () => {
    // CAS の穴だった経路: `submit: false` は状態を動かさないので、版を進めないと
    // 管理者が先に読んだ時刻がそのまま通り、読んでいない文章が公開できてしまう。
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
    const { entryId, submittedAt } = await submitEntry();

    vi.setSystemTime(new Date("2026-08-20T10:05:00.000Z"));
    caller = { ...LEARNER };
    const saved = await send("PUT", "/api/hall-of-fame/mine", {
      ...FULL_CONTENT,
      quote: "下書き保存でだけ書き換えた引用。",
      submit: false,
    });
    expect(saved.status).toBe(200);
    vi.useRealTimers();

    // 申請の意思は消さない (状態は submitted のまま) が、版は進む。
    expect(store.get(entryId)?.status).toBe("submitted");
    expect(store.get(entryId)?.submittedAt?.toISOString()).not.toBe(submittedAt);

    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`, {
      expected_submitted_at: submittedAt,
    });
    expect(res.status).toBe(409);
    expect(store.get(entryId)?.status).toBe("submitted");
  });

  it("中身が同じ保存では版を進めない (管理者のプレビューを無駄に無効化しない)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
    const { entryId, submittedAt } = await submitEntry();

    vi.setSystemTime(new Date("2026-08-20T10:05:00.000Z"));
    caller = { ...LEARNER };
    expect(
      (await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: false })).status,
    ).toBe(200);
    vi.useRealTimers();

    expect(store.get(entryId)?.submittedAt?.toISOString()).toBe(submittedAt);

    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`, {
      expected_submitted_at: submittedAt,
    });
    expect(res.status).toBe(200);
    expect(store.get(entryId)?.status).toBe("published");
  });

  it("読んだあと更新の直前に本人が書き直したら公開しない (更新条件に版を含める)", async () => {
    // 版チェック (`expected_submitted_at`) を通ってから `updateEntry` が走るまでの間に
    // 本人の保存が挟まる TOCTOU。歩んだ道の組み立て (往復 1 回) が実際の窓なので、
    // そこで本人の書き直しが入った状況を作る。
    const { entryId, submittedAt } = await submitEntry();
    vi.mocked(buildPathSnapshot).mockImplementationOnce(async () => {
      const row = store.get(entryId);
      if (row) {
        // 状態は submitted のまま、本文と版だけが進む (下書き保存と同じ形)。
        store.set(entryId, {
          ...row,
          quote: "公開ボタンの後に書き直した引用。",
          submittedAt: new Date(new Date(submittedAt).getTime() + 1000),
        });
      }
      return [{ id: "id-a", title: "HTML/CSS 入門研修" }];
    });

    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`, {
      expected_submitted_at: submittedAt,
    });
    expect(res.status).toBe(409);
    // 公開されていない = 読んでいない文章が世に出ていない。
    expect(store.get(entryId)?.status).toBe("submitted");
    expect(store.get(entryId)?.publishedAt ?? null).toBeNull();
  });

  it("公開時に歩んだ道がサーバ側で作られる", async () => {
    const id = await publishEntry();
    expect(buildPathSnapshot).toHaveBeenCalledTimes(1);
    expect(store.get(id)?.pathSnapshot).toHaveLength(4);
    expect(store.get(id)?.publishedBy).toBe("seed-admin");
  });

  it("存在しない掲載の公開は 404", async () => {
    caller = { ...ADMIN };
    expect(
      (
        await send("POST", "/api/cms/hall-of-fame/nope/publish", {
          expected_submitted_at: "2026-08-01T00:00:00.000Z",
        })
      ).status,
    ).toBe(404);
  });

  it("辞退したあとは管理者が公開できない (400)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    caller = { ...LEARNER };
    await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: true });
    expect((await send("POST", "/api/hall-of-fame/mine/decline")).status).toBe(200);

    caller = { ...ADMIN };
    const res = await send("POST", "/api/cms/hall-of-fame/hof-seed-learner/publish", {
      expected_submitted_at: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
    expect(store.get("hof-seed-learner")?.status).toBe("declined");
    expect((await (await get("/api/hall-of-fame")).json()).entries).toHaveLength(0);
  });

  it("非公開に戻すと申請済みへ戻り、監査に残る", async () => {
    const id = await publishEntry();
    vi.mocked(recordAudit).mockClear();
    caller = { ...ADMIN };
    const res = await send("POST", `/api/cms/hall-of-fame/${id}/unpublish`);
    expect(res.status).toBe(200);
    expect(store.get(id)?.status).toBe("submitted");
    expect(auditActions()).toEqual(["hof_close"]);
    // 公開読み出しからは即座に消える。
    expect((await await get(`/api/hall-of-fame/${id}`)).status).toBe(404);
  });

  it("公開中でない掲載は非公開にできない (400)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    expect((await send("POST", "/api/cms/hall-of-fame/hof-seed-learner/unpublish")).status).toBe(
      400,
    );
  });
});

describe("管理者の一覧 (未申請の下書きは載せない)", () => {
  it("記入中の下書きは admin の応答に **文字列としても** 現れない", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });

    // 本人が書きかけの下書きを保存する (申請はしない)。
    caller = { ...LEARNER };
    expect(
      (await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: false })).status,
    ).toBe(200);
    expect(store.get("hof-seed-learner")?.jobTitle).toBe(FULL_CONTENT.job_title);

    caller = { ...ADMIN };
    const text = await (await get("/api/cms/hall-of-fame")).text();
    // 記入画面の「この時点では誰にも見えません」が真であること。
    expect(text).not.toContain(FULL_CONTENT.job_title);
    expect(text).not.toContain(FULL_CONTENT.quote);
    for (const body of Object.values(FULL_CHAPTERS)) expect(text).not.toContain(body);
    // 行そのもの (誰を推薦したか・いつか) は運営の記録なので残る。
    const parsed = JSON.parse(text) as { entries: { status: string; job_title: string }[] };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.status).toBe("nominated");
    expect(parsed.entries[0]?.job_title).toBe("");
  });

  it("申請すると本文が載り、辞退すると載らなくなる", async () => {
    const { entryId } = await submitEntry();
    caller = { ...ADMIN };
    const submitted = await (await get("/api/cms/hall-of-fame")).text();
    expect(submitted).toContain(FULL_CONTENT.quote);

    caller = { ...LEARNER };
    expect((await send("POST", "/api/hall-of-fame/mine/decline")).status).toBe(200);

    caller = { ...ADMIN };
    const declined = await (await get("/api/cms/hall-of-fame")).text();
    expect(declined).not.toContain(FULL_CONTENT.quote);
    for (const body of Object.values(FULL_CHAPTERS)) expect(declined).not.toContain(body);
    const parsed = JSON.parse(declined) as { entries: { id: string; status: string }[] };
    // 名前と「辞退した」ことは残る — 同じ人へ招待を送り直さないため。
    expect(parsed.entries[0]?.id).toBe(entryId);
    expect(parsed.entries[0]?.status).toBe("declined");
  });

  it("取り下げたあとの本文も載らない", async () => {
    await publishEntry();
    caller = { ...LEARNER };
    await send("POST", "/api/hall-of-fame/mine/withdraw");
    caller = { ...ADMIN };
    const text = await (await get("/api/cms/hall-of-fame")).text();
    expect(text).not.toContain(FULL_CONTENT.quote);
    // 公開時に作った「歩んだ道」も一緒に伏せる。
    expect(text).not.toContain("HTML/CSS 入門研修");
  });
});

describe("公開読み出し (全ロール)", () => {
  it("公開された掲載はカードとして並ぶ (数値は載らない)", async () => {
    await publishEntry();
    caller = { ...LEARNER2 };
    const res = await get("/api/hall-of-fame");
    expect(res.status).toBe(200);
    const text = await res.text();
    const body = JSON.parse(text) as {
      entries: { id: string; name: string; job_title: string; path_preview: string[] }[];
    };
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]?.name).toBe("受講者");
    expect(body.entries[0]?.job_title).toBe("夜間バッチの番人");
    // 道はカードでは 3 つまで。
    expect(body.entries[0]?.path_preview).toHaveLength(3);
    // XP / レベル / クリア数のような序列の数値は応答に無い。
    for (const key of ["xp", "level", "cleared", "rank", "score"]) {
      expect(text).not.toContain(key);
    }
  });

  it("詳細は全文と歩んだ道を返す", async () => {
    const id = await publishEntry();
    caller = { ...LEARNER2 };
    const body = (await (await get(`/api/hall-of-fame/${id}`)).json()) as {
      entry: { chapters: HallOfFameChapters; path: { id: string }[] };
    };
    expect(body.entry.chapters.message).toBe(FULL_CHAPTERS.message);
    expect(body.entry.path).toHaveLength(4);
  });

  it("講師も掲載を読める (閲覧は全ロール)", async () => {
    const id = await publishEntry();
    caller = { ...INSTRUCTOR };
    expect((await get("/api/hall-of-fame")).status).toBe(200);
    expect((await get(`/api/hall-of-fame/${id}`)).status).toBe(200);
  });

  it("公開されていない掲載は存在ごと 404 (推薦・申請・辞退のどれでも)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    caller = { ...LEARNER2 };
    expect((await get("/api/hall-of-fame/hof-seed-learner")).status).toBe(404);

    caller = { ...LEARNER };
    await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: true });
    caller = { ...LEARNER2 };
    expect((await get("/api/hall-of-fame/hof-seed-learner")).status).toBe(404);
  });

  it("他テナントからは読めない (404)", async () => {
    const id = await publishEntry();
    caller = { ...LEARNER2, tenantId: "other" };
    expect((await get(`/api/hall-of-fame/${id}`)).status).toBe(404);
    expect(((await (await get("/api/hall-of-fame")).json()) as { entries: [] }).entries).toEqual(
      [],
    );
  });
});

describe("取り下げ", () => {
  it("公開後に本人が取り下げると一覧からも詳細からも消える", async () => {
    const id = await publishEntry();
    caller = { ...LEARNER };
    vi.mocked(recordAudit).mockClear();
    expect((await send("POST", "/api/hall-of-fame/mine/withdraw")).status).toBe(200);

    caller = { ...LEARNER2 };
    expect(
      ((await (await get("/api/hall-of-fame")).json()) as { entries: [] }).entries,
    ).toHaveLength(0);
    expect((await get(`/api/hall-of-fame/${id}`)).status).toBe(404);
  });

  it("辞退と取り下げは監査に残さない (断りにくさを作らない)", async () => {
    await publishEntry();
    caller = { ...LEARNER };
    vi.mocked(recordAudit).mockClear();
    await send("POST", "/api/hall-of-fame/mine/withdraw");
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("公開前は取り下げではなく辞退 (不正な遷移は 400)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    caller = { ...LEARNER };
    expect((await send("POST", "/api/hall-of-fame/mine/withdraw")).status).toBe(400);
    expect((await send("POST", "/api/hall-of-fame/mine/decline")).status).toBe(200);
    // 二度目の辞退はもう受け付けない。
    expect((await send("POST", "/api/hall-of-fame/mine/decline")).status).toBe(400);
  });

  it("取り下げたあとは直して出し直せる (画面の案内どおりの道が残る)", async () => {
    // 掲載中の画面は「直したいときは一度取り下げてください」と案内する。取り下げた
    // 先で編集できないと、その案内が行き止まりになる (再招待も一意キーで塞がる)。
    const entryId = await publishEntry();
    caller = { ...LEARNER };
    expect((await send("POST", "/api/hall-of-fame/mine/withdraw")).status).toBe(200);
    expect(store.get(entryId)?.status).toBe("withdrawn");

    // 直して出し直す → 申請済みに戻る。
    const saved = await send("PUT", "/api/hall-of-fame/mine", {
      ...FULL_CONTENT,
      quote: "取り下げてから直した引用。",
      submit: true,
    });
    expect(saved.status).toBe(200);
    expect(store.get(entryId)?.status).toBe("submitted");

    // 公開はこのあとも管理者の操作 (同意の順序は変わらない)。
    caller = { ...ADMIN };
    const submittedAt = store.get(entryId)?.submittedAt?.toISOString();
    const published = await send("POST", `/api/cms/hall-of-fame/${entryId}/publish`, {
      expected_submitted_at: submittedAt,
    });
    expect(published.status).toBe(200);
    expect(store.get(entryId)?.status).toBe("published");
  });

  it("辞退したあとは書き直せない (載りたくないという意思表示なので)", async () => {
    caller = { ...ADMIN };
    await send("POST", "/api/cms/hall-of-fame/nominate", { userId: "seed-learner" });
    caller = { ...LEARNER };
    expect((await send("POST", "/api/hall-of-fame/mine/decline")).status).toBe(200);
    expect((await send("PUT", "/api/hall-of-fame/mine", FULL_CONTENT)).status).toBe(400);
  });

  it("掲載中は本人でも編集できない (取り下げてから直す)", async () => {
    await publishEntry();
    caller = { ...LEARNER };
    const res = await send("PUT", "/api/hall-of-fame/mine", { ...FULL_CONTENT, submit: true });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain("取り下げ");
  });

  it("招待の無い人の辞退は 404", async () => {
    caller = { ...LEARNER2 };
    expect((await send("POST", "/api/hall-of-fame/mine/decline")).status).toBe(404);
  });
});

describe("「この道をたどる」CTA", () => {
  it("閲覧者が未クリアで始められる最初のステージを指す", async () => {
    const id = await publishEntry();
    caller = { ...LEARNER2 };
    const body = (await (await get(`/api/hall-of-fame/${id}`)).json()) as {
      follow: { stage_id: string; stage_title: string } | null;
    };
    // id-a はクリア済みなので飛ばし、進行中の id-b を指す。
    expect(body.follow).toEqual({ stage_id: "id-b", stage_title: "JavaScript 入門研修" });
  });

  it("たどれる星が無ければ CTA を出さない", async () => {
    const id = await publishEntry();
    vi.mocked(loadSkillMapSource).mockImplementation(async () => ({
      stages: [],
      clearedStageIds: new Set<string>(),
      enrolledStageIds: new Set<string>(),
      unlockedStageIds: new Set<string>(),
    }));
    caller = { ...LEARNER2 };
    const body = (await (await get(`/api/hall-of-fame/${id}`)).json()) as { follow: null };
    expect(body.follow).toBeNull();
  });

  it.each([
    ["講師", () => ({ ...INSTRUCTOR })],
    // 管理者は自己開始 API 自体は使えるが、殿堂の CTA は受講者の画面にしか出ない。
    // 出さない画面のためにスキルマップを組み立てない。
    ["管理者", () => ({ ...ADMIN })],
  ])("受講者以外 (%s) には計算もしない", async (_label, makeCaller) => {
    const id = await publishEntry();
    vi.mocked(loadSkillMapSource).mockClear();
    caller = makeCaller();
    const body = (await (await get(`/api/hall-of-fame/${id}`)).json()) as { follow: null };
    expect(body.follow).toBeNull();
    expect(loadSkillMapSource).not.toHaveBeenCalled();
  });
});
