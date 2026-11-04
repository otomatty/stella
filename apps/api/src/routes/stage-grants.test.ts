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

vi.mock("../lib/stage-audience.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/stage-audience.js")>();
  return {
    ...actual,
    loadGrantedStagesForTenant: vi.fn(async () => [
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

const stageLookup = vi.fn(
  async (): Promise<Record<string, unknown>[]> => [
    { id: "stage-granted-1", audience: "granted", tenantId: "ses" },
  ],
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
const insertGrant = vi.fn(
  (_row: { tenantId: string; stageId: string; profileId: string; grantedBy: string }) => ({
    kind: "insert" as const,
  }),
);
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

  function queueStages(...rows: Record<string, unknown>[][]) {
    const queue = rows.map((row) => row);
    stageLookup.mockImplementation(async () => queue.shift() ?? []);
  }

  function inserted() {
    return insertGrant.mock.calls.map((call) => call[0]);
  }

  it("新たに割り当てると granted の祖先にも足す", async () => {
    queueStages(
      [
        {
          id: "stage-child",
          slug: "kubernetes-basics",
          audience: "granted",
          tenantId: "ses",
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
    expect(inserted().map((row) => row.stageId)).toEqual([
      "stage-child",
      "stage-mid",
      "stage-devops",
      "stage-python",
    ]);
    expect(inserted().every((row) => row.profileId === "seed-learner")).toBe(true);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        action: "stage_grants_replace",
        metadata: expect.objectContaining({
          profile_ids: ["seed-learner"],
          ancestor_grants: [
            { stage_id: "stage-mid", profile_ids: ["seed-learner"] },
            { stage_id: "stage-devops", profile_ids: ["seed-learner"] },
            { stage_id: "stage-python", profile_ids: ["seed-learner"] },
          ],
        }),
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
          tenantId: "ses",
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
          tenantId: "ses",
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
  });

  it("割当を外すときは祖先に触らない", async () => {
    queueStages([
      {
        id: "stage-child",
        slug: "kubernetes-basics",
        audience: "granted",
        tenantId: "ses",
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
        metadata: { profile_ids: ["seed-learner"] },
      }),
    );
  });
});
