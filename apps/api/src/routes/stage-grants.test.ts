/**
 * 専用ステージ割当 API の route テスト (認可と PUT の基本)。
 */

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stageUnlocks } from "../db/schema.js";
import type { Env } from "../env.js";
import { recordAudit } from "../lib/audit.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { stageGrantsRoute } from "./stage-grants.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/stage-audience.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/stage-audience.js")>();
  return {
    ...actual,
    loadGrantedStages: vi.fn(async () => [
      {
        id: "stage-granted-1",
        slug: "custom-basics",
        title: "専用補講",
        category: "基礎",
      },
    ]),
  };
});

let caller: {
  id: string;
  role: "instructor" | "student" | "admin";
  name: string;
  email: null;
} = {
  id: "seed-instructor",
  role: "instructor" as const,
  name: "講師",
  email: null,
};

const stageLookup = vi.fn(
  async (): Promise<Record<string, unknown>[]> => [{ id: "stage-granted-1", audience: "granted" }],
);

const profileLookup = vi.fn(async () => [{ id: "seed-learner", role: "student", disabled: false }]);

const grantSelect = vi.fn(async () => [] as { stageId?: string; profileId: string }[]);

const learnerSelect = vi.fn(async () => [
  {
    id: "seed-learner",
    display_name: "受講者A",
    email: "a@example.com",
    role: "student",
    disabled: false,
  },
]);

const deleteGrants = vi.fn(() => ({ kind: "delete" }));
const deleted: { table: unknown; where: unknown }[] = [];
const conflictIgnored: { stageId: string; profileId: string }[] = [];
const unlockRows: { stageId: string; userId: string; via: string }[] = [];
const unlockInserted: {
  stageId: string;
  userId: string;
  via: string;
  conflictTarget: unknown;
}[] = [];

type InsertRow = {
  stageId: string;
  profileId?: string;
  grantedBy?: string;
  userId?: string;
  via?: string;
  unlockedAt?: Date;
};

const insertGrant = vi.fn((row: InsertRow) => ({
  kind: "insert" as const,
  onConflictDoNothing(config?: { target?: unknown }) {
    if (typeof row.profileId === "string") {
      conflictIgnored.push({ stageId: row.stageId, profileId: row.profileId });
    }
    if (typeof row.userId === "string" && typeof row.via === "string") {
      unlockInserted.push({
        stageId: row.stageId,
        userId: row.userId,
        via: row.via,
        conflictTarget: config?.target,
      });
    }
    return { kind: "insert" as const };
  },
}));
const batchGrants = vi.fn(async () => undefined);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** drizzle の where を、列名と束縛値だけの文字列にほどく。モックは SQL を実行しない。 */
function sqlSketch(node: unknown): string {
  const parts: string[] = [];
  const walk = (chunk: unknown): void => {
    if (Array.isArray(chunk)) {
      parts.push("(");
      let first = true;
      for (const item of chunk) {
        if (!first) parts.push(", ");
        first = false;
        walk(item);
      }
      parts.push(")");
      return;
    }
    if (!isRecord(chunk)) return;
    if (Array.isArray(chunk.queryChunks)) {
      for (const child of chunk.queryChunks) walk(child);
      return;
    }
    if (Array.isArray(chunk.value) && chunk.value.every((item) => typeof item === "string")) {
      parts.push(chunk.value.join(""));
      return;
    }
    if (
      typeof chunk.name === "string" &&
      typeof chunk.mapToDriverValue === "function" &&
      "table" in chunk
    ) {
      parts.push(chunk.name);
      return;
    }
    if ("value" in chunk && isRecord(chunk.encoder)) {
      const value = chunk.value;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        parts.push(JSON.stringify(value));
      }
    }
  };
  walk(node);
  return parts.join("");
}

function stageIdsInSketch(sketch: string): Set<string> | null {
  const equals = /stage_id = ("(?:\\.|[^"\\])*")/.exec(sketch);
  if (equals?.[1]) {
    const parsed: unknown = JSON.parse(equals[1]);
    return typeof parsed === "string" ? new Set([parsed]) : new Set();
  }
  const list = /stage_id in \(([^)]*)\)/.exec(sketch);
  if (!list?.[1]) return null;
  const ids: string[] = [];
  for (const match of list[1].matchAll(/"((?:\\.|[^"\\])*)"/g)) {
    const raw = match[1];
    if (raw === undefined) continue;
    const parsed: unknown = JSON.parse(`"${raw}"`);
    if (typeof parsed === "string") ids.push(parsed);
  }
  return new Set(ids);
}

/** GET は via = staff の行だけ、PUT は講座の全行を、ルートが組んだ where に合わせて返す。 */
function readUnlockRows(where?: unknown): { stageId: string; userId: string; via: string }[] {
  const sketch = sqlSketch(where);
  const staffOnly = sketch.includes('via = "staff"');
  const stageIds = stageIdsInSketch(sketch);
  return unlockRows.filter((row) => {
    if (staffOnly && row.via !== "staff") return false;
    if (stageIds && !stageIds.has(row.stageId)) return false;
    return true;
  });
}

const unlockSelect = vi.fn(async (where?: unknown) => readUnlockRows(where));

function selectWithLimit(resolver: () => Promise<unknown>) {
  const run = () => resolver();
  return {
    from: () => ({
      where: () => ({
        limit: (_n?: number) => run(),
      }),
    }),
  };
}

function selectWhereOnly(resolver: (where?: unknown) => Promise<unknown>) {
  const chain = {
    where: (where?: unknown) => resolver(where),
    // biome-ignore lint/suspicious/noThenProperty: drizzle のクエリは thenable。where の無い select もある。
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      resolver().then(onFulfilled, onRejected),
  };
  return { from: () => chain };
}

const mockDb = {
  select: (fields?: Record<string, unknown>) => {
    const keys = Object.keys(fields ?? {});
    if (keys.includes("id") && keys.includes("audience")) {
      return selectWithLimit(stageLookup);
    }
    if (keys.includes("userId")) {
      return selectWhereOnly(unlockSelect);
    }
    if (keys.includes("profileId")) {
      return selectWhereOnly(grantSelect);
    }
    if (keys.includes("display_name")) {
      return selectWhereOnly(learnerSelect);
    }
    return selectWhereOnly(profileLookup);
  },
  delete: (table: unknown) => ({
    where: (where: unknown) => {
      deleted.push({ table, where });
      return deleteGrants();
    },
  }),
  insert: () => ({ values: insertGrant }),
  batch: batchGrants,
};

function columnNames(target: unknown): string[] {
  if (!Array.isArray(target)) return [];
  const names: string[] = [];
  for (const column of target) {
    if (isRecord(column) && typeof column.name === "string") names.push(column.name);
  }
  return names;
}

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  return {
    ...actual,
    getCaller: vi.fn(async () => ({ caller, db: mockDb as never })),
  };
});

const env = {} as Env;
const { app } = mountTestApp(env, stageGrantsRoute);

describe("GET /api/stage-grants", () => {
  beforeEach(() => {
    caller = {
      id: "seed-instructor",
      role: "instructor",
      name: "講師",
      email: null,
    };
    grantSelect.mockResolvedValue([]);
    unlockRows.length = 0;
    unlockSelect.mockClear();
    learnerSelect.mockResolvedValue([
      {
        id: "seed-learner",
        display_name: "受講者A",
        email: "a@example.com",
        role: "student",
        disabled: false,
      },
    ]);
    vi.mocked(recordAudit).mockClear();
  });

  it("staff は granted ステージ一覧を取得できる", async () => {
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    const body = await json<{ stages: { slug: string }[] }>(res);
    expect(body.stages[0]?.slug).toBe("custom-basics");
  });

  it("無効になった割当先もピッカーに残す", async () => {
    grantSelect.mockResolvedValue([{ stageId: "stage-granted-1", profileId: "disabled-learner" }]);
    learnerSelect.mockResolvedValue([
      {
        id: "seed-learner",
        display_name: "受講者A",
        email: "a@example.com",
        role: "student",
        disabled: false,
      },
      {
        id: "disabled-learner",
        display_name: "元受講者",
        email: "old@example.com",
        role: "student",
        disabled: true,
      },
    ]);
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    const body = await json<{
      stages: { profile_ids: string[] }[];
      learners: { id: string; selectable: boolean }[];
    }>(res);
    expect(body.stages[0]?.profile_ids).toEqual(["disabled-learner"]);
    expect(body.learners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "seed-learner", selectable: true }),
        expect.objectContaining({ id: "disabled-learner", selectable: false }),
      ]),
    );
  });

  it("staff が開けた入口だけを unlocked_profile_ids に返す", async () => {
    unlockRows.push(
      { stageId: "stage-granted-1", userId: "seed-learner", via: "staff" },
      { stageId: "stage-granted-1", userId: "skill-learner", via: "skill_check" },
      { stageId: "other-stage", userId: "seed-learner", via: "staff" },
    );
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    expect(sqlSketch(unlockSelect.mock.calls[0]?.[0])).toBe(
      sqlSketch(
        and(eq(stageUnlocks.via, "staff"), inArray(stageUnlocks.stageId, ["stage-granted-1"])),
      ),
    );
    const body = await json<{ stages: { unlocked_profile_ids: string[] }[] }>(res);
    expect(body.stages[0]?.unlocked_profile_ids).toEqual(["seed-learner"]);
  });

  it("student は 403", async () => {
    caller = { ...caller, id: "seed-learner", role: "student", name: "受講者" };
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/stage-grants/:stageId", () => {
  beforeEach(() => {
    caller = {
      id: "seed-instructor",
      role: "instructor",
      name: "講師",
      email: null,
    };
    stageLookup.mockResolvedValue([{ id: "stage-granted-1", audience: "granted" }]);
    grantSelect.mockResolvedValue([]);
    profileLookup.mockResolvedValue([{ id: "seed-learner", role: "student", disabled: false }]);
    vi.mocked(recordAudit).mockClear();
    deleteGrants.mockClear();
    insertGrant.mockClear();
    batchGrants.mockClear();
    conflictIgnored.length = 0;
    deleted.length = 0;
    unlockInserted.length = 0;
    unlockRows.length = 0;
    unlockSelect.mockClear();
  });

  it("granted ステージの割当を 1 トランザクションで置換する", async () => {
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    expect(batchGrants).toHaveBeenCalled();
    expect(deleteGrants).toHaveBeenCalled();
    expect(insertGrant).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalled();
  });

  it("既に grant がある無効受講者は残せる", async () => {
    grantSelect.mockResolvedValue([{ profileId: "disabled-learner" }]);
    profileLookup.mockResolvedValue([{ id: "disabled-learner", role: "student", disabled: true }]);
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["disabled-learner"] }),
    });
    expect(res.status).toBe(200);
  });

  it("catalog ステージへの PUT は 400", async () => {
    stageLookup.mockImplementation(async () => [{ id: "stage-catalog-1", audience: "catalog" }]);
    const res = await request(app, env, "/api/stage-grants/stage-catalog-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(400);
  });

  function queueStages(...rows: Record<string, unknown>[][]) {
    const queue = rows.map((row) => row);
    stageLookup.mockImplementation(async () => queue.shift() ?? []);
  }

  function inserted() {
    return insertGrant.mock.calls.map((call) => call[0]);
  }

  function ignoredStageIds() {
    return conflictIgnored.map((row) => row.stageId);
  }

  it("新たに割り当てると granted の祖先にも足す", async () => {
    queueStages(
      [
        {
          id: "stage-child",
          slug: "kubernetes-basics",
          audience: "granted",
          parent: "networking-ops-basics",
          prerequisites: '["networking-ops-basics"]',
        },
      ],
      [
        {
          id: "stage-mid",
          slug: "networking-ops-basics",
          audience: "granted",
          parent: "devops-basics",
          prerequisites: '["devops-basics"]',
        },
      ],
      [
        {
          id: "stage-devops",
          slug: "devops-basics",
          audience: "granted",
          parent: null,
          prerequisites: '["python-basics"]',
        },
      ],
      [
        {
          id: "stage-python",
          slug: "python-basics",
          audience: "granted",
          parent: "node-api-basics",
          prerequisites: '["node-api-basics"]',
        },
      ],
      [
        {
          id: "stage-node",
          slug: "node-api-basics",
          audience: "catalog",
          parent: null,
          prerequisites: null,
        },
      ],
    );
    grantSelect.mockResolvedValue([]);
    const res = await request(app, env, "/api/stage-grants/stage-child", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    const ancestorGrants = [
      { stage_id: "stage-mid", profile_ids: ["seed-learner"] },
      { stage_id: "stage-devops", profile_ids: ["seed-learner"] },
      { stage_id: "stage-python", profile_ids: ["seed-learner"] },
    ];
    const body = await json<{
      stage_id: string;
      profile_ids: string[];
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body).toEqual({
      stage_id: "stage-child",
      profile_ids: ["seed-learner"],
      unlocked_profile_ids: [],
      ancestor_grants: ancestorGrants,
    });
    expect(inserted().map((row) => row.stageId)).toEqual([
      "stage-child",
      "stage-mid",
      "stage-devops",
      "stage-python",
    ]);
    expect(ignoredStageIds()).toEqual(["stage-mid", "stage-devops", "stage-python"]);
    expect(inserted().every((row) => row.profileId === "seed-learner")).toBe(true);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action: "stage_grants_replace",
        metadata: expect.objectContaining({
          profile_ids: ["seed-learner"],
          unlocked_profile_ids: [],
          ancestor_grants: ancestorGrants,
        }),
      }),
    );
  });

  it("祖先を足さないときは ancestor_grants が空配列", async () => {
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    const body = await json<{
      stage_id: string;
      profile_ids: string[];
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body).toEqual({
      stage_id: "stage-granted-1",
      profile_ids: ["seed-learner"],
      unlocked_profile_ids: [],
      ancestor_grants: [],
    });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: { profile_ids: ["seed-learner"], unlocked_profile_ids: [] },
      }),
    );
  });

  it("祖先にすでにある割当は重複しない", async () => {
    queueStages(
      [
        {
          id: "stage-child",
          slug: "fe-kamoku-b",
          audience: "granted",
          parent: null,
          prerequisites: '["fe-kamoku-a"]',
        },
      ],
      [
        {
          id: "stage-mid",
          slug: "fe-kamoku-a",
          audience: "granted",
          parent: "dev-env-basics",
          prerequisites: '["dev-env-basics"]',
        },
      ],
      [
        {
          id: "stage-root",
          slug: "dev-env-basics",
          audience: "catalog",
          parent: null,
          prerequisites: null,
        },
      ],
    );
    grantSelect
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ stageId: "stage-mid", profileId: "seed-learner" }]);
    const res = await request(app, env, "/api/stage-grants/stage-child", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    expect(inserted()).toEqual([
      expect.objectContaining({ stageId: "stage-child", profileId: "seed-learner" }),
    ]);
  });

  it("線の親が catalog に着いたら祖先の探索を止める", async () => {
    queueStages(
      [
        {
          id: "stage-child",
          slug: "devops-basics",
          audience: "granted",
          parent: "python-basics",
          prerequisites: '["python-basics"]',
        },
      ],
      [
        {
          id: "stage-python",
          slug: "python-basics",
          audience: "granted",
          parent: "node-api-basics",
          prerequisites: '["node-api-basics"]',
        },
      ],
      [
        {
          id: "stage-node",
          slug: "node-api-basics",
          audience: "catalog",
          parent: "secret-granted",
          prerequisites: '["secret-granted"]',
        },
      ],
      [
        {
          id: "stage-secret",
          slug: "secret-granted",
          audience: "granted",
          parent: null,
          prerequisites: null,
        },
      ],
    );
    grantSelect.mockResolvedValue([]);
    const res = await request(app, env, "/api/stage-grants/stage-child", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    expect(stageLookup).toHaveBeenCalledTimes(3);
    expect(inserted().map((row) => row.stageId)).toEqual(["stage-child", "stage-python"]);
    expect(ignoredStageIds()).toEqual(["stage-python"]);
  });

  it("線の親が catalog でも prerequisites の granted 講座と、その前提に足す", async () => {
    queueStages(
      [
        {
          id: "stage-extra",
          slug: "extra-leaf",
          audience: "granted",
          parent: "catalog-root",
          prerequisites: '["catalog-root", "granted-mid"]',
        },
      ],
      [
        {
          id: "stage-catalog",
          slug: "catalog-root",
          audience: "catalog",
          parent: "hidden-granted",
          prerequisites: '["hidden-granted"]',
        },
      ],
      [
        {
          id: "stage-mid",
          slug: "granted-mid",
          audience: "granted",
          parent: "catalog-root",
          prerequisites: '["catalog-root", "granted-root"]',
        },
      ],
      [
        {
          id: "stage-root",
          slug: "granted-root",
          audience: "granted",
          parent: "catalog-root",
          prerequisites: '["catalog-root"]',
        },
      ],
    );
    grantSelect.mockResolvedValue([]);
    const res = await request(app, env, "/api/stage-grants/stage-extra", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    const ancestorGrants = [
      { stage_id: "stage-mid", profile_ids: ["seed-learner"] },
      { stage_id: "stage-root", profile_ids: ["seed-learner"] },
    ];
    const body = await json<{
      stage_id: string;
      profile_ids: string[];
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body).toEqual({
      stage_id: "stage-extra",
      profile_ids: ["seed-learner"],
      unlocked_profile_ids: [],
      ancestor_grants: ancestorGrants,
    });
    expect(stageLookup).toHaveBeenCalledTimes(4);
    expect(inserted().map((row) => row.stageId)).toEqual([
      "stage-extra",
      "stage-mid",
      "stage-root",
    ]);
    expect(ignoredStageIds()).toEqual(["stage-mid", "stage-root"]);
  });

  it("菱形の前提でも同じ granted 講座は一度だけ足す", async () => {
    queueStages(
      [
        {
          id: "stage-top",
          slug: "diamond-top",
          audience: "granted",
          parent: "catalog-root",
          prerequisites: '["catalog-root", "diamond-left", "diamond-right"]',
        },
      ],
      [
        {
          id: "stage-catalog",
          slug: "catalog-root",
          audience: "catalog",
          parent: null,
          prerequisites: null,
        },
      ],
      [
        {
          id: "stage-left",
          slug: "diamond-left",
          audience: "granted",
          parent: "diamond-shared",
          prerequisites: '["diamond-shared"]',
        },
      ],
      [
        {
          id: "stage-right",
          slug: "diamond-right",
          audience: "granted",
          parent: "diamond-shared",
          prerequisites: '["diamond-shared"]',
        },
      ],
      [
        {
          id: "stage-shared",
          slug: "diamond-shared",
          audience: "granted",
          parent: "catalog-root",
          prerequisites: '["catalog-root"]',
        },
      ],
    );
    grantSelect.mockResolvedValue([]);
    const res = await request(app, env, "/api/stage-grants/stage-top", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    const ancestorGrants = [
      { stage_id: "stage-left", profile_ids: ["seed-learner"] },
      { stage_id: "stage-right", profile_ids: ["seed-learner"] },
      { stage_id: "stage-shared", profile_ids: ["seed-learner"] },
    ];
    const body = await json<{
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body.ancestor_grants).toEqual(ancestorGrants);
    expect(stageLookup).toHaveBeenCalledTimes(5);
    expect(inserted().map((row) => row.stageId)).toEqual([
      "stage-top",
      "stage-left",
      "stage-right",
      "stage-shared",
    ]);
    expect(ignoredStageIds()).toEqual(["stage-left", "stage-right", "stage-shared"]);
  });

  it("壊れた prerequisites は捨てて、線の親だけをたどる", async () => {
    queueStages(
      [
        {
          id: "stage-child",
          slug: "extra-leaf",
          audience: "granted",
          parent: "granted-parent",
          prerequisites: "not-json",
        },
      ],
      [
        {
          id: "stage-parent",
          slug: "granted-parent",
          audience: "granted",
          parent: "catalog-root",
          prerequisites: '[1, null, "catalog-root", "  ", ""]',
        },
      ],
      [
        {
          id: "stage-catalog",
          slug: "catalog-root",
          audience: "catalog",
          parent: "hidden-granted",
          prerequisites: '["hidden-granted"]',
        },
      ],
    );
    grantSelect.mockResolvedValue([]);
    const res = await request(app, env, "/api/stage-grants/stage-child", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    expect(stageLookup).toHaveBeenCalledTimes(3);
    expect(inserted().map((row) => row.stageId)).toEqual(["stage-child", "stage-parent"]);
    expect(ignoredStageIds()).toEqual(["stage-parent"]);
  });

  it("割当を外すときは祖先に触らない", async () => {
    queueStages([
      {
        id: "stage-child",
        slug: "kubernetes-basics",
        audience: "granted",
        parent: "networking-ops-basics",
        prerequisites: '["networking-ops-basics"]',
      },
    ]);
    grantSelect.mockResolvedValue([{ profileId: "seed-learner" }, { profileId: "seed-learner2" }]);
    profileLookup.mockResolvedValue([{ id: "seed-learner", role: "student", disabled: false }]);
    const res = await request(app, env, "/api/stage-grants/stage-child", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    expect(stageLookup).toHaveBeenCalledTimes(1);
    expect(inserted()).toEqual([
      expect.objectContaining({ stageId: "stage-child", profileId: "seed-learner" }),
    ]);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: { profile_ids: ["seed-learner"], unlocked_profile_ids: [] },
      }),
    );
  });

  it("unlocked_profile_ids を指定すると staff の入口を入れ替え、skill_check は残す", async () => {
    unlockRows.push(
      { stageId: "stage-granted-1", userId: "old-staff", via: "staff" },
      { stageId: "stage-granted-1", userId: "skill-learner", via: "skill_check" },
    );
    profileLookup.mockResolvedValue([
      { id: "seed-learner", role: "student", disabled: false },
      { id: "skill-learner", role: "student", disabled: false },
    ]);
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({
        profile_ids: ["seed-learner", "skill-learner"],
        unlocked_profile_ids: ["seed-learner", "skill-learner"],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json<{
      stage_id: string;
      profile_ids: string[];
      unlocked_profile_ids: string[];
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body).toEqual({
      stage_id: "stage-granted-1",
      profile_ids: ["seed-learner", "skill-learner"],
      unlocked_profile_ids: ["seed-learner"],
      ancestor_grants: [],
    });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action: "stage_grants_replace",
        metadata: {
          profile_ids: ["seed-learner", "skill-learner"],
          unlocked_profile_ids: ["seed-learner"],
        },
      }),
    );
    const unlockDelete = deleted.find((op) => op.table === stageUnlocks);
    expect(sqlSketch(unlockDelete?.where)).toBe(
      sqlSketch(
        and(
          eq(stageUnlocks.stageId, "stage-granted-1"),
          eq(stageUnlocks.via, "staff"),
          notInArray(stageUnlocks.userId, ["seed-learner", "skill-learner"]),
        ),
      ),
    );
    expect(unlockInserted).toEqual([
      {
        stageId: "stage-granted-1",
        userId: "seed-learner",
        via: "staff",
        conflictTarget: [stageUnlocks.userId, stageUnlocks.stageId],
      },
      {
        stageId: "stage-granted-1",
        userId: "skill-learner",
        via: "staff",
        conflictTarget: [stageUnlocks.userId, stageUnlocks.stageId],
      },
    ]);
    expect(columnNames(unlockInserted[0]?.conflictTarget)).toEqual(["user_id", "stage_id"]);
  });

  it("選択を変えずに保存すると、指定されていない人の staff の行だけを消す", async () => {
    unlockRows.push({ stageId: "stage-granted-1", userId: "seed-learner", via: "staff" });
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({
        profile_ids: ["seed-learner"],
        unlocked_profile_ids: ["seed-learner"],
      }),
    });
    expect(res.status).toBe(200);
    const unlockDelete = deleted.find((op) => op.table === stageUnlocks);
    expect(sqlSketch(unlockDelete?.where)).toBe(
      sqlSketch(
        and(
          eq(stageUnlocks.stageId, "stage-granted-1"),
          eq(stageUnlocks.via, "staff"),
          notInArray(stageUnlocks.userId, ["seed-learner"]),
        ),
      ),
    );
  });

  it("profile_ids に無い人を unlocked_profile_ids に入れると 400", async () => {
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({
        profile_ids: ["seed-learner"],
        unlocked_profile_ids: ["seed-learner", "seed-learner2"],
      }),
    });
    expect(res.status).toBe(400);
    expect(await json<{ error: string }>(res)).toEqual({
      error: "入口を開けられるのは、割り当てる受講者だけです",
    });
    expect(batchGrants).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("unlocked_profile_ids を省くと、割当から外した人の staff の入口だけを閉じる", async () => {
    grantSelect.mockResolvedValue([{ profileId: "seed-learner" }, { profileId: "leaving" }]);
    unlockRows.push(
      { stageId: "stage-granted-1", userId: "seed-learner", via: "staff" },
      { stageId: "stage-granted-1", userId: "leaving", via: "staff" },
      { stageId: "stage-granted-1", userId: "skill-learner", via: "skill_check" },
    );
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(200);
    const body = await json<{
      stage_id: string;
      profile_ids: string[];
      unlocked_profile_ids: string[];
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body).toEqual({
      stage_id: "stage-granted-1",
      profile_ids: ["seed-learner"],
      unlocked_profile_ids: ["seed-learner"],
      ancestor_grants: [],
    });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: {
          profile_ids: ["seed-learner"],
          unlocked_profile_ids: ["seed-learner"],
        },
      }),
    );
    const unlockDelete = deleted.find((op) => op.table === stageUnlocks);
    expect(sqlSketch(unlockDelete?.where)).toBe(
      sqlSketch(
        and(
          eq(stageUnlocks.stageId, "stage-granted-1"),
          eq(stageUnlocks.via, "staff"),
          notInArray(stageUnlocks.userId, ["seed-learner"]),
        ),
      ),
    );
    expect(unlockInserted).toEqual([]);
  });
});
