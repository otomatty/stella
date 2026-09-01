/**
 * 専用ステージ割当 API の route テスト (認可と PUT の基本)。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { recordAudit } from "../lib/audit.js";
import { stageGrantsRoute } from "./stage-grants.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/stage-audience.js", () => ({
  loadGrantedStagesForTenant: vi.fn(async () => [
    {
      id: "stage-granted-1",
      slug: "custom-basics",
      title: "専用補講",
      category: "基礎",
    },
  ]),
}));

let caller: {
  id: string;
  tenantId: string;
  role: "instructor" | "student" | "admin";
  name: string;
  email: null;
} = {
  id: "seed-instructor",
  tenantId: "ses",
  role: "instructor" as const,
  name: "講師",
  email: null,
};

const stageLookup = vi.fn(async () => [
  { id: "stage-granted-1", audience: "granted", tenantId: "ses" },
]);

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
const insertGrant = vi.fn(() => ({ kind: "insert" }));
const batchGrants = vi.fn(async () => undefined);

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

function selectWhereOnly(resolver: () => Promise<unknown>) {
  const run = () => resolver();
  return {
    from: () => ({
      where: () => run(),
    }),
  };
}

const mockDb = {
  select: (fields?: Record<string, unknown>) => {
    const keys = Object.keys(fields ?? {});
    if (keys.includes("id") && keys.includes("audience")) {
      return selectWithLimit(stageLookup);
    }
    if (keys.includes("profileId")) {
      return selectWhereOnly(grantSelect);
    }
    if (keys.includes("display_name")) {
      return selectWhereOnly(learnerSelect);
    }
    return selectWhereOnly(profileLookup);
  },
  delete: () => ({ where: deleteGrants }),
  insert: () => ({ values: insertGrant }),
  batch: batchGrants,
};

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
      tenantId: "ses",
      role: "instructor",
      name: "講師",
      email: null,
    };
    grantSelect.mockResolvedValue([]);
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
      tenantId: "ses",
      role: "instructor",
      name: "講師",
      email: null,
    };
    stageLookup.mockResolvedValue([
      { id: "stage-granted-1", audience: "granted", tenantId: "ses" },
    ]);
    grantSelect.mockResolvedValue([]);
    profileLookup.mockResolvedValue([{ id: "seed-learner", role: "student", disabled: false }]);
    vi.mocked(recordAudit).mockClear();
    deleteGrants.mockClear();
    insertGrant.mockClear();
    batchGrants.mockClear();
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
    stageLookup.mockImplementation(async () => [
      { id: "stage-catalog-1", audience: "catalog", tenantId: "ses" },
    ]);
    const res = await request(app, env, "/api/stage-grants/stage-catalog-1", {
      token: "t",
      method: "PUT",
      body: JSON.stringify({ profile_ids: ["seed-learner"] }),
    });
    expect(res.status).toBe(400);
  });
});
