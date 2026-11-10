/**
 * 専用ステージ割当 API の route テスト (認可と PUT の基本)。
 */

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { drizzle } from "drizzle-orm/d1";

import { stageGrants, stageUnlocks } from "../db/schema.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import { recordAudit } from "../lib/audit.js";
import { D1_MAX_BOUND_PARAMS } from "../lib/enrollment-bulk.js";
import { loadGrantedStages } from "../lib/stage-audience.js";
import {
  grantRowsByStageStatements,
  planStageGrantWriteStatements,
} from "../lib/stage-grant-diff.js";
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
  role: "student" | "admin";
  name: string;
  email: null;
} = {
  id: "seed-admin",
  role: "admin" as const,
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
    email: "a@example.com" as string | null,
    role: "student",
    disabled: false,
  },
]);

const deleteGrants = vi.fn(() => ({ kind: "delete" }));
const deleted: { table: unknown; where: unknown }[] = [];
const conflictIgnored: { stageId: string; profileId: string }[] = [];
const unlockRows: { stageId: string; userId: string; via: string }[] = [];
const stageCatalog: { id: string; slug: string; title?: string; prerequisites: string | null }[] =
  [];
const enrollmentRows: { userId: string; stageId: string; status: string }[] = [];
const certificateRows: { userId: string; stageId: string; revoked: boolean }[] = [];
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

function quotedIds(sketch: string, column: string): Set<string> | null {
  const equals = new RegExp(String.raw`${column} = ("(?:\\.|[^"\\])*")`).exec(sketch);
  if (equals?.[1]) {
    const parsed: unknown = JSON.parse(equals[1]);
    return typeof parsed === "string" ? new Set([parsed]) : new Set();
  }
  const list = new RegExp(String.raw`${column} in \(([^)]*)\)`).exec(sketch);
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

function readEnrollmentRows(
  where?: unknown,
): { userId: string; stageId: string; status: string }[] {
  const sketch = sqlSketch(where);
  const userIds = quotedIds(sketch, "user_id");
  const stageIds = stageIdsInSketch(sketch);
  const completedOnly = sketch.includes('status = "completed"');
  return enrollmentRows
    .filter((row) => {
      if (userIds && !userIds.has(row.userId)) return false;
      if (stageIds && !stageIds.has(row.stageId)) return false;
      if (completedOnly && row.status !== "completed") return false;
      return true;
    })
    .map((row) => ({ userId: row.userId, stageId: row.stageId, status: row.status }));
}

function readCertificateRows(where?: unknown): { userId: string; stageId: string }[] {
  const sketch = sqlSketch(where);
  const userIds = quotedIds(sketch, "user_id");
  const stageIds = stageIdsInSketch(sketch);
  const activeOnly = sketch.includes("revoked = false");
  return certificateRows
    .filter((row) => {
      if (userIds && !userIds.has(row.userId)) return false;
      if (stageIds && !stageIds.has(row.stageId)) return false;
      if (activeOnly && row.revoked) return false;
      return true;
    })
    .map((row) => ({ userId: row.userId, stageId: row.stageId }));
}

/** GET は via = staff の行だけ、PUT はステージの全行を、ルートが組んだ where に合わせて返す。 */
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

const DRIZZLE_TABLE_NAME = Symbol.for("drizzle:Name");

function selectedTableName(fields: Record<string, unknown> | undefined): string | null {
  if (!fields) return null;
  for (const value of Object.values(fields)) {
    if (!isRecord(value) || !isRecord(value.table)) continue;
    const name = (value.table as Record<symbol, unknown>)[DRIZZLE_TABLE_NAME];
    if (typeof name === "string") return name;
  }
  return null;
}

const mockDb = {
  select: (fields?: Record<string, unknown>) => {
    const keys = Object.keys(fields ?? {});
    const table = selectedTableName(fields);
    if (keys.includes("id") && keys.includes("audience")) {
      return selectWithLimit(stageLookup);
    }
    if (table === "stages") {
      return selectWhereOnly(async () => stageCatalog.map((row) => ({ ...row })));
    }
    if (table === "enrollments") {
      return selectWhereOnly(async (where) => readEnrollmentRows(where));
    }
    if (table === "certificates") {
      return selectWhereOnly(async (where) => readCertificateRows(where));
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
      id: "seed-admin",
      role: "admin",
      name: "講師",
      email: null,
    };
    grantSelect.mockResolvedValue([]);
    unlockRows.length = 0;
    stageCatalog.length = 0;
    enrollmentRows.length = 0;
    certificateRows.length = 0;
    unlockSelect.mockClear();
    vi.mocked(loadGrantedStages).mockReset();
    vi.mocked(loadGrantedStages).mockImplementation(async () => [
      {
        id: "stage-granted-1",
        slug: "custom-basics",
        title: "専用補講",
        category: "基礎",
      },
    ]);
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

  it.each(["admin", "platform_admin"])("古い GET でも %s を選べる", async (role) => {
    learnerSelect.mockResolvedValue([person("staff", "スタッフ", role)]);
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    expect((await json<{ learners: unknown[] }>(res)).learners).toEqual([
      expect.objectContaining({ id: "staff", selectable: true }),
    ]);
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

  it("staff が前提を免除した受講者だけを unlocked_profile_ids に返す", async () => {
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

  function learner(id: string, name: string) {
    return {
      id,
      display_name: name,
      email: `${id}@example.com`,
      role: "student" as const,
      disabled: false,
    };
  }

  it("前提をすべてクリアした受講者だけを prerequisites_cleared_profile_ids に返す", async () => {
    stageCatalog.push(
      { id: "stage-pre-a", slug: "pre-a", prerequisites: null },
      { id: "stage-pre-b", slug: "pre-b", prerequisites: null },
      { id: "stage-granted-1", slug: "custom-basics", prerequisites: '["pre-a","pre-b"]' },
    );
    enrollmentRows.push(
      { userId: "all-done", stageId: "stage-pre-a", status: "completed" },
      { userId: "all-done", stageId: "stage-pre-b", status: "completed" },
      { userId: "partial", stageId: "stage-pre-a", status: "completed" },
      { userId: "mixed", stageId: "stage-pre-b", status: "completed" },
      { userId: "active-only", stageId: "stage-pre-a", status: "active" },
      { userId: "active-only", stageId: "stage-pre-b", status: "active" },
      { userId: "expired-only", stageId: "stage-pre-a", status: "expired" },
      { userId: "expired-only", stageId: "stage-pre-b", status: "expired" },
    );
    certificateRows.push(
      { userId: "all-done", stageId: "stage-pre-a", revoked: true },
      { userId: "cert-only", stageId: "stage-pre-a", revoked: false },
      { userId: "cert-only", stageId: "stage-pre-b", revoked: false },
      { userId: "mixed", stageId: "stage-pre-a", revoked: false },
      { userId: "revoked-only", stageId: "stage-pre-a", revoked: true },
      { userId: "revoked-only", stageId: "stage-pre-b", revoked: true },
    );
    learnerSelect.mockResolvedValue([
      learner("all-done", "全部"),
      learner("partial", "一部"),
      learner("cert-only", "修了証"),
      learner("mixed", "合わせ"),
      learner("revoked-only", "取消"),
      learner("active-only", "進行"),
      learner("expired-only", "期限"),
    ]);
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    const body = await json<{ stages: { prerequisites_cleared_profile_ids: string[] }[] }>(res);
    expect(new Set(body.stages[0]?.prerequisites_cleared_profile_ids)).toEqual(
      new Set(["all-done", "cert-only", "mixed"]),
    );
    expect(body.stages[0]?.prerequisites_cleared_profile_ids).toHaveLength(3);
  });

  it("前提の無いステージでは受講者全員を prerequisites_cleared_profile_ids に返す", async () => {
    vi.mocked(loadGrantedStages).mockResolvedValueOnce([
      { id: "stage-granted-1", slug: "custom-basics", title: "専用補講", category: "基礎" },
      { id: "stage-open", slug: "open-basics", title: "前提なし", category: null },
    ]);
    stageCatalog.push(
      { id: "stage-granted-1", slug: "custom-basics", prerequisites: null },
      { id: "stage-open", slug: "open-basics", prerequisites: "[]" },
    );
    learnerSelect.mockResolvedValue([
      learner("seed-learner", "受講者A"),
      learner("seed-learner2", "受講者B"),
    ]);
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    const body = await json<{
      stages: { prerequisites_cleared_profile_ids: string[] }[];
    }>(res);
    expect(body.stages).toHaveLength(2);
    for (const stage of body.stages) {
      expect(new Set(stage.prerequisites_cleared_profile_ids)).toEqual(
        new Set(["seed-learner", "seed-learner2"]),
      );
    }
  });

  it("解けない前提 slug はクリア済みにしない", async () => {
    stageCatalog.push(
      { id: "stage-pre-a", slug: "pre-a", prerequisites: null },
      {
        id: "stage-granted-1",
        slug: "custom-basics",
        prerequisites: '["pre-a","missing-stage"]',
      },
    );
    enrollmentRows.push({
      userId: "seed-learner",
      stageId: "stage-pre-a",
      status: "completed",
    });
    const res = await request(app, env, "/api/stage-grants", { token: "t" });
    expect(res.status).toBe(200);
    const body = await json<{ stages: { prerequisites_cleared_profile_ids: string[] }[] }>(res);
    expect(body.stages[0]?.prerequisites_cleared_profile_ids).toEqual([]);
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
      id: "seed-admin",
      role: "admin",
      name: "講師",
      email: null,
    };
    stageLookup.mockClear();
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

  it.each(["admin", "platform_admin"])("PUT でも %s を割り当てて免除できる", async (role) => {
    profileLookup.mockResolvedValue([{ id: "teacher", role, disabled: false }]);
    const res = await request(app, env, "/api/stage-grants/stage-granted-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["teacher"], unlocked_profile_ids: ["teacher"] }),
    });
    expect(res.status).toBe(200);
    expect(writtenRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stageId: "stage-granted-1", profileId: "teacher" }),
        expect.objectContaining({ stageId: "stage-granted-1", userId: "teacher", via: "staff" }),
      ]),
    );
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

  it("線の親が catalog でも prerequisites の granted ステージと、その前提に足す", async () => {
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

  it("菱形の前提でも同じ granted ステージは一度だけ足す", async () => {
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

  it("unlocked_profile_ids を指定すると staff の前提の免除を入れ替え、skill_check は残す", async () => {
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
      error: "前提を免除できるのは、割り当てるユーザーだけです",
    });
    expect(batchGrants).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("unlocked_profile_ids を省くと、割当から外した人の staff の前提の免除だけを外す", async () => {
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

function person(
  id: string,
  displayName: string,
  role = "student",
  disabled = false,
  email: string | null = `${id}@example.com`,
) {
  return { id, display_name: displayName, email, role, disabled };
}

function writtenRows(): {
  stageId?: string;
  profileId?: string;
  grantedBy?: string;
  userId?: string;
  via?: string;
}[] {
  const rows: {
    stageId?: string;
    profileId?: string;
    grantedBy?: string;
    userId?: string;
    via?: string;
  }[] = [];
  for (const call of insertGrant.mock.calls) {
    const value: unknown = call[0];
    const list = Array.isArray(value) ? value : [value];
    for (const row of list) {
      if (typeof row === "object" && row !== null) rows.push(row);
    }
  }
  return rows;
}

function dummyDb(): Db {
  const dummy = {
    prepare: () => ({ bind: () => ({}) }),
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => "",
  };
  return drizzle(dummy as never);
}

const grantedStage = {
  id: "stage-granted-1",
  slug: "custom-basics",
  title: "専用補講",
  category: "基礎" as string | null,
  audience: "granted",
  parent: null as string | null,
  prerequisites: null as string | null,
};

describe("GET /api/stage-grants/:stageId/learners", () => {
  beforeEach(() => {
    caller = { id: "seed-admin", role: "admin", name: "講師", email: null };
    stageLookup.mockClear();
    stageLookup.mockResolvedValue([{ ...grantedStage, prerequisites: '["pre-a","pre-b"]' }]);
    grantSelect.mockReset();
    grantSelect.mockResolvedValue([]);
    learnerSelect.mockReset();
    learnerSelect.mockResolvedValue([
      person("ada", "山田", "student", false, "Ada@Example.com"),
      person("ken", "Ｋｅｎ", "student", false, null),
      person("sato", "佐藤"),
    ]);
    unlockRows.length = 0;
    stageCatalog.length = 0;
    stageCatalog.push(
      { id: "stage-pre-a", slug: "pre-a", title: "前提A", prerequisites: null },
      { id: "stage-pre-b", slug: "pre-b", title: "前提B", prerequisites: null },
    );
    enrollmentRows.length = 0;
    certificateRows.length = 0;
    vi.mocked(recordAudit).mockClear();
  });

  it("student は 403", async () => {
    caller = { ...caller, id: "seed-learner", role: "student", name: "受講者" };
    const res = await request(app, env, "/api/stage-grants/stage-granted-1/learners", {
      token: "t",
    });
    expect(res.status).toBe(403);
  });

  it("ステージが無ければ 404、catalog なら 400", async () => {
    stageLookup.mockResolvedValueOnce([]);
    const missing = await request(app, env, "/api/stage-grants/missing/learners", { token: "t" });
    expect(missing.status).toBe(404);

    stageLookup.mockResolvedValueOnce([{ ...grantedStage, audience: "catalog" }]);
    const catalog = await request(app, env, "/api/stage-grants/stage-granted-1/learners", {
      token: "t",
    });
    expect(catalog.status).toBe(400);
    expect(await json<{ error: string }>(catalog)).toEqual({
      error: "このステージは Extra ステージ (audience=granted) ではありません",
    });
  });

  it("知らない status と prereq は 400", async () => {
    const status = await request(
      app,
      env,
      "/api/stage-grants/stage-granted-1/learners?status=gone",
      { token: "t" },
    );
    expect(status.status).toBe(400);
    const prereq = await request(
      app,
      env,
      "/api/stage-grants/stage-granted-1/learners?prereq=started",
      { token: "t" },
    );
    expect(prereq.status).toBe(400);
  });

  it.each(["admin", "platform_admin"])(
    "/learners は %s の role と selectable を返す",
    async (role) => {
      learnerSelect.mockResolvedValue([person("staff", "スタッフ", role)]);
      const res = await request(app, env, "/api/stage-grants/stage-granted-1/learners", {
        token: "t",
      });
      expect(res.status).toBe(200);
      const body = await json<{ learners: unknown[]; counts: { learners: number }; total: number }>(
        res,
      );
      expect(body.learners).toEqual([
        expect.objectContaining({ id: "staff", role, selectable: true }),
      ]);
      expect(body.counts.learners).toBe(1);
      expect(body.total).toBe(1);
    },
  );

  it("名前とメールを、全角半角と大文字小文字を無視して検索する", async () => {
    const ada = new URLSearchParams({ q: "  ＡＤＡ " });
    const byEmail = await request(
      app,
      env,
      `/api/stage-grants/stage-granted-1/learners?${ada.toString()}`,
      { token: "t" },
    );
    expect(byEmail.status).toBe(200);
    const emailBody = await json<{ learners: { id: string }[] }>(byEmail);
    expect(emailBody.learners.map((row) => row.id)).toEqual(["ada"]);

    const ken = new URLSearchParams({ q: "ken" });
    const byName = await request(
      app,
      env,
      `/api/stage-grants/stage-granted-1/learners?${ken.toString()}`,
      { token: "t" },
    );
    const nameBody = await json<{ learners: { id: string }[] }>(byName);
    expect(nameBody.learners.map((row) => row.id)).toEqual(["ken"]);
  });

  it("割り当て・免除・前提で絞り、counts は絞り込み前の人数", async () => {
    caller = { ...caller, id: "teacher-1", name: "講師A" };
    learnerSelect.mockResolvedValue([
      person("ada", "あ"),
      person("ken", "い"),
      person("sato", "う"),
      person("old", "無効", "student", true),
      person("teacher-1", "講師A", "admin"),
      person("teacher-2", "講師B", "admin"),
    ]);
    grantSelect.mockResolvedValue([
      { profileId: "ada" },
      { profileId: "ken" },
      { profileId: "old" },
    ]);
    unlockRows.push({ stageId: "stage-granted-1", userId: "ada", via: "staff" });
    enrollmentRows.push(
      { userId: "ada", stageId: "stage-pre-a", status: "completed" },
      { userId: "ada", stageId: "stage-pre-b", status: "completed" },
      { userId: "ken", stageId: "stage-pre-a", status: "active" },
    );

    const res = await request(
      app,
      env,
      "/api/stage-grants/stage-granted-1/learners?status=unassigned",
      { token: "t" },
    );
    expect(res.status).toBe(200);
    const body = await json<{
      counts: { learners: number; assigned: number; unassigned: number; exempted: number };
      total: number;
      learners: { id: string }[];
      stage: { prerequisites: { slug: string; title: string }[] };
    }>(res);
    expect(body.counts).toEqual({ learners: 6, assigned: 3, unassigned: 3, exempted: 1 });
    expect(body.total).toBe(3);
    expect(body.learners.map((row) => row.id)).toEqual(["sato", "teacher-1", "teacher-2"]);
    expect(body).not.toHaveProperty("instructors");
    expect(body.stage.prerequisites).toEqual([
      { id: "stage-pre-a", slug: "pre-a", title: "前提A" },
      { id: "stage-pre-b", slug: "pre-b", title: "前提B" },
    ]);

    const doing = await request(
      app,
      env,
      "/api/stage-grants/stage-granted-1/learners?prereq=doing",
      { token: "t" },
    );
    expect(
      (await json<{ learners: { id: string }[] }>(doing)).learners.map((row) => row.id),
    ).toEqual(["ken"]);
    const notDone = await request(
      app,
      env,
      "/api/stage-grants/stage-granted-1/learners?prereq=not_done",
      { token: "t" },
    );
    expect(notDone.status).toBe(200);
    expect(
      new Set((await json<{ learners: { id: string }[] }>(notDone)).learners.map((row) => row.id)),
    ).toEqual(new Set(["ken", "sato", "old", "teacher-1", "teacher-2"]));
  });

  it("前提の 3 状態と腕試しの行を返す。解けない slug は落とす", async () => {
    learnerSelect.mockResolvedValue([
      person("done", "完了"),
      person("doing", "途中"),
      person("none", "未着手"),
      person("skill", "腕試し"),
    ]);
    grantSelect.mockResolvedValue([{ profileId: "skill" }]);
    unlockRows.push({ stageId: "stage-granted-1", userId: "skill", via: "skill_check" });
    enrollmentRows.push({ userId: "doing", stageId: "stage-pre-a", status: "active" });
    certificateRows.push(
      { userId: "done", stageId: "stage-pre-a", revoked: false },
      { userId: "done", stageId: "stage-pre-b", revoked: false },
      { userId: "done", stageId: "stage-pre-a", revoked: true },
    );

    const res = await request(app, env, "/api/stage-grants/stage-granted-1/learners", {
      token: "t",
    });
    expect(res.status).toBe(200);
    const body = await json<{
      counts: { exempted: number };
      stage: { prerequisites: { slug: string }[] };
      learners: {
        id: string;
        prerequisite_status: string;
        prerequisites_cleared: boolean;
        unlocked_by_skill_check: boolean;
        exempted: boolean;
      }[];
    }>(res);
    expect(body.stage.prerequisites.map((row) => row.slug)).toEqual(["pre-a", "pre-b"]);
    const byId = new Map(body.learners.map((row) => [row.id, row]));
    expect(byId.get("done")).toMatchObject({
      prerequisite_status: "done",
      prerequisites_cleared: true,
    });
    expect(byId.get("doing")).toMatchObject({ prerequisite_status: "doing" });
    expect(byId.get("none")).toMatchObject({
      prerequisite_status: "none",
      prerequisites_cleared: false,
    });
    expect(byId.get("skill")).toMatchObject({
      unlocked_by_skill_check: true,
      exempted: false,
    });
    expect(body.counts.exempted).toBe(0);

    stageLookup.mockResolvedValue([
      { ...grantedStage, prerequisites: '["pre-a","missing-stage"]' },
    ]);
    const unresolved = await request(app, env, "/api/stage-grants/stage-granted-1/learners", {
      token: "t",
    });
    const unresolvedBody = await json<{
      stage: { prerequisites: { slug: string }[] };
      learners: { id: string; prerequisites_cleared: boolean }[];
    }>(unresolved);
    expect(unresolvedBody.stage.prerequisites.map((row) => row.slug)).toEqual(["pre-a"]);
    expect(unresolvedBody.learners.find((row) => row.id === "done")?.prerequisites_cleared).toBe(
      false,
    );
  });

  it("前提が空のステージは全員クリア済み", async () => {
    stageLookup.mockResolvedValue([{ ...grantedStage, prerequisites: null }]);
    const res = await request(app, env, "/api/stage-grants/stage-granted-1/learners?prereq=done", {
      token: "t",
    });
    const body = await json<{
      learners: { prerequisite_status: string; prerequisites_cleared: boolean }[];
      stage: { prerequisites: unknown[] };
    }>(res);
    expect(body.stage.prerequisites).toEqual([]);
    expect(body.learners).toHaveLength(3);
    expect(
      body.learners.every((row) => row.prerequisites_cleared && row.prerequisite_status === "done"),
    ).toBe(true);
    const none = await request(app, env, "/api/stage-grants/stage-granted-1/learners?prereq=none", {
      token: "t",
    });
    expect((await json<{ total: number }>(none)).total).toBe(0);
  });

  it("50 人ずつ返し、次の offset が無ければ null", async () => {
    stageLookup.mockResolvedValue([{ ...grantedStage, prerequisites: null }]);
    learnerSelect.mockResolvedValue(
      Array.from({ length: 55 }, (_, index) =>
        person(`u-${String(index).padStart(2, "0")}`, `受講者${String(index).padStart(2, "0")}`),
      ),
    );
    const first = await request(app, env, "/api/stage-grants/stage-granted-1/learners", {
      token: "t",
    });
    const firstBody = await json<{
      total: number;
      next_offset: number | null;
      learners: { id: string }[];
      counts: { learners: number };
    }>(first);
    expect(firstBody.total).toBe(55);
    expect(firstBody.counts.learners).toBe(55);
    expect(firstBody.learners).toHaveLength(50);
    expect(firstBody.next_offset).toBe(50);
    expect(firstBody.learners[0]?.id).toBe("u-00");
    expect(firstBody.learners[49]?.id).toBe("u-49");

    const second = await request(app, env, "/api/stage-grants/stage-granted-1/learners?offset=50", {
      token: "t",
    });
    const secondBody = await json<{ next_offset: number | null; learners: { id: string }[] }>(
      second,
    );
    expect(secondBody.learners.map((row) => row.id)).toEqual([
      "u-50",
      "u-51",
      "u-52",
      "u-53",
      "u-54",
    ]);
    expect(secondBody.next_offset).toBeNull();
  });
});

describe("PATCH /api/stage-grants/:stageId", () => {
  beforeEach(() => {
    caller = { id: "seed-admin", role: "admin", name: "講師", email: null };
    stageLookup.mockClear();
    stageLookup.mockResolvedValue([{ ...grantedStage }]);
    grantSelect.mockReset();
    grantSelect.mockResolvedValue([]);
    profileLookup.mockReset();
    profileLookup.mockResolvedValue([{ id: "seed-learner", role: "student", disabled: false }]);
    unlockRows.length = 0;
    unlockSelect.mockClear();
    deleted.length = 0;
    unlockInserted.length = 0;
    conflictIgnored.length = 0;
    deleteGrants.mockClear();
    insertGrant.mockClear();
    batchGrants.mockClear();
    vi.mocked(recordAudit).mockClear();
  });

  function patch(body: unknown, stageId = "stage-granted-1") {
    return request(app, env, `/api/stage-grants/${stageId}`, {
      token: "t",
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  it("student は 403", async () => {
    caller = { ...caller, role: "student", id: "seed-learner", name: "受講者" };
    expect((await patch({ add: ["seed-learner"] })).status).toBe(403);
  });

  it("ステージが無ければ 404、catalog なら 400", async () => {
    stageLookup.mockResolvedValueOnce([]);
    expect((await patch({ add: ["seed-learner"] }, "missing")).status).toBe(404);
    stageLookup.mockResolvedValueOnce([{ ...grantedStage, audience: "catalog" }]);
    const res = await patch({ add: ["seed-learner"] });
    expect(res.status).toBe(400);
    expect(await json<{ error: string }>(res)).toEqual({
      error: "このステージは Extra ステージ (audience=granted) ではありません",
    });
  });

  it("空の差分、重なり、配列でない値は 400", async () => {
    expect((await patch({})).status).toBe(400);
    expect((await patch({ add: ["seed-learner"], remove: ["seed-learner"] })).status).toBe(400);
    expect((await patch({ exempt: ["seed-learner"], unexempt: ["seed-learner"] })).status).toBe(
      400,
    );
    const res = await patch({ add: "seed-learner" });
    expect(res.status).toBe(400);
    expect(await json<{ error: string }>(res)).toEqual({
      error: "add は文字列の配列で指定してください",
    });
    expect(batchGrants).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("存在しない id、無効なユーザーの追加は 400", async () => {
    profileLookup.mockResolvedValue([
      { id: "seed-learner", role: "student", disabled: false },
      { id: "old", role: "student", disabled: true },
      { id: "teacher", role: "admin", disabled: false },
    ]);
    for (const id of ["missing", "old"]) {
      const res = await patch({ add: [id] });
      expect(res.status).toBe(400);
      expect(await json<{ error: string }>(res)).toEqual({
        error: "割当できないユーザーが含まれています",
      });
    }
    const exempt = await patch({ exempt: ["missing"] });
    expect(exempt.status).toBe(400);
    expect(await json<{ error: string }>(exempt)).toEqual({
      error: "割当できないユーザーが含まれています",
    });
    expect(batchGrants).not.toHaveBeenCalled();
  });

  it("割り当てが無い人の免除は 400", async () => {
    const res = await patch({ exempt: ["seed-learner"] });
    expect(res.status).toBe(400);
    expect(await json<{ error: string }>(res)).toEqual({
      error: "前提を免除できるのは、割り当てるユーザーだけです",
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it.each(["admin", "platform_admin"])("PATCH で %s を追加・免除できる", async (role) => {
    profileLookup.mockResolvedValue([{ id: "teacher", role, disabled: false }]);
    const res = await patch({ add: ["teacher"], exempt: ["teacher"] });
    expect(res.status).toBe(200);
    expect(
      (await json<{ counts: { learners: number; assigned: number; exempted: number } }>(res))
        .counts,
    ).toEqual({ learners: 1, assigned: 1, unassigned: 0, exempted: 1 });
    expect(writtenRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stageId: "stage-granted-1", profileId: "teacher" }),
        expect.objectContaining({ stageId: "stage-granted-1", userId: "teacher", via: "staff" }),
      ]),
    );
  });

  it.each(["admin", "platform_admin"])("PATCH で割当済みの %s を免除できる", async (role) => {
    profileLookup.mockResolvedValue([{ id: "teacher", role, disabled: false }]);
    grantSelect.mockResolvedValue([{ profileId: "teacher" }]);
    const res = await patch({ exempt: ["teacher"] });
    expect(res.status).toBe(200);
    expect(writtenRows()).toEqual([
      expect.objectContaining({ stageId: "stage-granted-1", userId: "teacher", via: "staff" }),
    ]);
  });

  it("新しい受講者を割り当て、監査ログを残す", async () => {
    const res = await patch({ add: ["seed-learner"] });
    expect(res.status).toBe(200);
    const body = await json<{
      stage_id: string;
      counts: { learners: number; assigned: number; unassigned: number; exempted: number };
      ancestor_grants: unknown[];
    }>(res);
    expect(body).toEqual({
      stage_id: "stage-granted-1",
      counts: { learners: 1, assigned: 1, unassigned: 0, exempted: 0 },
      ancestor_grants: [],
    });
    expect(batchGrants).toHaveBeenCalledTimes(1);
    expect(writtenRows()).toEqual([
      expect.objectContaining({
        stageId: "stage-granted-1",
        profileId: "seed-learner",
        grantedBy: "seed-admin",
      }),
    ]);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "seed-admin" }),
      expect.objectContaining({
        action: "stage_grants_update",
        targetType: "stage",
        targetId: "stage-granted-1",
        metadata: {
          added: ["seed-learner"],
          removed: [],
          exempted: [],
          unexempted: [],
        },
      }),
    );
  });

  it("既に割り当て済みの追加は書き込まない", async () => {
    grantSelect.mockResolvedValue([{ profileId: "seed-learner" }]);
    const res = await patch({ add: ["seed-learner"] });
    expect(res.status).toBe(200);
    expect(writtenRows()).toEqual([]);
    expect(batchGrants).not.toHaveBeenCalled();
  });

  it("外すと staff の免除だけ消え、腕試しの行は delete の対象に入らない", async () => {
    grantSelect.mockResolvedValue([{ profileId: "leaving" }, { profileId: "skill-learner" }]);
    profileLookup.mockResolvedValue([
      { id: "leaving", role: "student", disabled: false },
      { id: "skill-learner", role: "student", disabled: false },
    ]);
    unlockRows.push(
      { stageId: "stage-granted-1", userId: "leaving", via: "staff" },
      { stageId: "stage-granted-1", userId: "skill-learner", via: "skill_check" },
    );
    const res = await patch({ remove: ["leaving", "skill-learner"] });
    expect(res.status).toBe(200);
    const body = await json<{
      counts: { assigned: number; exempted: number };
    }>(res);
    expect(body.counts).toMatchObject({ assigned: 0, exempted: 0 });
    const grantDelete = deleted.find((op) => op.table === stageGrants);
    const unlockDelete = deleted.find((op) => op.table === stageUnlocks);
    expect(sqlSketch(grantDelete?.where)).toBe(
      sqlSketch(
        and(
          eq(stageGrants.stageId, "stage-granted-1"),
          inArray(stageGrants.profileId, ["leaving", "skill-learner"]),
        ),
      ),
    );
    expect(sqlSketch(unlockDelete?.where)).toBe(
      sqlSketch(
        and(
          eq(stageUnlocks.stageId, "stage-granted-1"),
          eq(stageUnlocks.via, "staff"),
          inArray(stageUnlocks.userId, ["leaving", "skill-learner"]),
        ),
      ),
    );
    expect(writtenRows().filter((row) => row.userId)).toEqual([]);
  });

  it("割り当て済みの免除を足し、腕試しの人は上書きしない", async () => {
    grantSelect.mockResolvedValue([{ profileId: "seed-learner" }, { profileId: "skill-learner" }]);
    profileLookup.mockResolvedValue([
      { id: "seed-learner", role: "student", disabled: false },
      { id: "skill-learner", role: "student", disabled: false },
    ]);
    unlockRows.push({ stageId: "stage-granted-1", userId: "skill-learner", via: "skill_check" });
    const res = await patch({ exempt: ["seed-learner", "skill-learner"] });
    expect(res.status).toBe(200);
    expect(writtenRows().filter((row) => row.userId)).toEqual([
      expect.objectContaining({
        userId: "seed-learner",
        stageId: "stage-granted-1",
        via: "staff",
      }),
    ]);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          exempted: ["seed-learner"],
          added: [],
        }),
      }),
    );
  });

  it("免除の解除は staff の行だけを消す", async () => {
    grantSelect.mockResolvedValue([{ profileId: "seed-learner" }]);
    unlockRows.push({ stageId: "stage-granted-1", userId: "seed-learner", via: "staff" });
    const res = await patch({ unexempt: ["seed-learner"] });
    expect(res.status).toBe(200);
    const unlockDelete = deleted.find((op) => op.table === stageUnlocks);
    expect(sqlSketch(unlockDelete?.where)).toBe(
      sqlSketch(
        and(
          eq(stageUnlocks.stageId, "stage-granted-1"),
          eq(stageUnlocks.via, "staff"),
          inArray(stageUnlocks.userId, ["seed-learner"]),
        ),
      ),
    );
    expect(deleted.filter((op) => op.table === stageGrants)).toEqual([]);
  });

  it("新たに割り当てると granted の祖先にも足し、既にある組は触らない", async () => {
    const queue = [
      [
        {
          id: "stage-child",
          slug: "kubernetes-basics",
          title: "子",
          category: null,
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
    ];
    stageLookup.mockImplementation(async () => queue.shift() ?? []);
    grantSelect.mockImplementation(async (where?: unknown) => {
      const stageIds = stageIdsInSketch(sqlSketch(where));
      const rows = [{ stageId: "stage-mid", profileId: "seed-learner" }];
      return rows.filter((row) => !stageIds || stageIds.has(row.stageId));
    });
    const res = await patch({ add: ["seed-learner"] }, "stage-child");
    expect(res.status).toBe(200);
    const body = await json<{
      ancestor_grants: { stage_id: string; profile_ids: string[] }[];
    }>(res);
    expect(body.ancestor_grants).toEqual([
      { stage_id: "stage-devops", profile_ids: ["seed-learner"] },
      { stage_id: "stage-python", profile_ids: ["seed-learner"] },
    ]);
    expect(writtenRows().map((row) => row.stageId)).toEqual([
      "stage-child",
      "stage-devops",
      "stage-python",
    ]);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action: "stage_grants_update",
        metadata: expect.objectContaining({
          added: ["seed-learner"],
          ancestor_grants: body.ancestor_grants,
        }),
      }),
    );
  });

  it("300 人を一度に足せる", async () => {
    const ids = Array.from({ length: 300 }, (_, index) => `learner-${index}`);
    profileLookup.mockResolvedValue(
      ids.map((id) => ({ id, role: "student" as const, disabled: false })),
    );
    const res = await patch({ add: ids });
    expect(res.status).toBe(200);
    expect(batchGrants).toHaveBeenCalledTimes(1);
    const body = await json<{ counts: { assigned: number } }>(res);
    expect(body.counts.assigned).toBe(300);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({ added: ids }),
      }),
    );
  });
});

describe("stage grant writes stay within D1 bind limits", () => {
  it("300 人の追加・削除・免除でも、どの文もバインドは 100 以下", () => {
    const ids = Array.from({ length: 300 }, (_, index) => `learner-${index}`);
    const db = dummyDb();
    const statements = planStageGrantWriteStatements(db, {
      stageId: "stage-granted-1",
      grantedBy: "seed-admin",
      grantRows: [
        ...ids.map((profileId) => ({ stageId: "stage-granted-1", profileId })),
        ...ids.map((profileId) => ({ stageId: "ancestor", profileId })),
      ],
      removeProfileIds: ids,
      deleteStaffUserIds: ids,
      exemptUserIds: ids,
    });
    const grantInserts = statements.filter((stmt) =>
      stmt.toSQL().sql.includes('insert into "stage_grants"'),
    );
    expect(grantInserts.length).toBeGreaterThan(1);
    for (const stmt of statements) {
      expect(stmt.toSQL().params.length).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }

    const lookups = grantRowsByStageStatements(
      db,
      Array.from({ length: 150 }, (_, index) => `stage-${index}`),
    );
    expect(lookups.length).toBeGreaterThan(1);
    for (const stmt of lookups) {
      expect(stmt.toSQL().params.length).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
      expect(stmt.toSQL().sql).not.toMatch(/profile_id" in/i);
    }
  });
});
