import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { GuidedStagesResponse } from "@stella/shared/stage-grants/types";
import { getDb } from "../db/client.js";
import {
  auditLogs,
  enrollments,
  learnerFocus,
  lessonProgress,
  lessons,
  profiles,
  sections,
  stageGrants,
  stages,
  stageUnlocks,
  taskProblemResults,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { loadSkillMapSource } from "../lib/skill-map-data.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { stageGrantsRoute } from "./stage-grants.js";
import { skillMapRoute } from "./skill-map.js";

let database: ReturnType<typeof sqliteD1>;
let env: Env;
let admin: string;
let learner: string;
let db: ReturnType<typeof getDb>;
const app = mountTestApp({} as Env, stageGrantsRoute, skillMapRoute).app;
const empty = { source_name: null, due_at: null, message: null };
const guidance = {
  source_name: "架空の案内元",
  due_at: "2026-12-04T23:59:59+09:00",
  message: "<b>案内の文</b>",
};
const normalized = { ...guidance, due_at: "2026-12-04T14:59:59.000Z" };
const caller = { id: "learner", role: "student" as const, name: "架空の受講者", email: null };
function call(path: string, method = "GET", body?: unknown, token = admin) {
  return request(app, env, `http://localhost${path}`, {
    method,
    token,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function update(body: unknown, token = admin) {
  return call("/api/stage-grants/extra/guidance", "PATCH", body, token);
}
async function mine() {
  const res = await call("/api/stage-grants/mine", "GET", undefined, learner);
  expect(res.status).toBe(200);
  return json<GuidedStagesResponse>(res);
}
async function grant(userId = "learner", stageId = "extra") {
  await db.insert(stageGrants).values({ profileId: userId, stageId });
}
beforeEach(async () => {
  database = sqliteD1();
  env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
  db = getDb(env);
  await db.insert(tenants).values({ id: "ses", name: "架空の組織" });
  for (const id of ["admin", "learner", "other", "new"])
    await db
      .insert(profiles)
      .values({ id, displayName: `架空の${id}`, role: id === "admin" ? "admin" : "student" });
  await db
    .insert(stages)
    .values({ id: "basic", slug: "sample-basic", title: "架空の入口", status: "published" });
  await db.insert(stages).values({
    id: "extra",
    slug: "sample-extra",
    title: "架空の案内ステージ",
    status: "published",
    audience: "granted",
    prerequisites: '["sample-basic"]',
  });
  for (const id of ["basic", "extra"]) {
    await db.insert(sections).values({ id: `unit-${id}`, stageId: id, title: "架空の単元" });
    await db.insert(lessons).values({
      id: `lesson-${id}`,
      sectionId: `unit-${id}`,
      title: "架空のレッスン",
      type: "text",
    });
  }
  admin = await signAccessToken("test-secret", "admin", "admin@example.invalid");
  learner = await signAccessToken("test-secret", "learner", "learner@example.invalid");
});
afterEach(() => database.sqlite.close());

describe("割り当ての案内 (実 SQLite)", () => {
  it("受講者の更新を403にする", async () => {
    expect((await update({ all: true, ...guidance }, learner)).status).toBe(403);
  });
  it("指定した人・全員の案内を置き換え、nullで消し、監査に残す", async () => {
    await grant();
    await grant("other");
    expect((await update({ profile_ids: ["learner"], ...guidance })).status).toBe(200);
    expect(await mine()).toMatchObject({ stages: [normalized] });
    let rows = await db.select().from(stageGrants);
    expect(rows.find((r) => r.profileId === "other")?.sourceName).toBeNull();
    const mixed = await json<{
      guidance_summary: { uniform: boolean };
      learners: { id: string; guidance: unknown }[];
    }>(await call("/api/stage-grants/extra/learners"));
    expect(mixed.guidance_summary.uniform).toBe(false);
    expect(mixed.learners.find((r) => r.id === "learner")?.guidance).toEqual(normalized);
    expect((await update({ all: true, ...guidance })).status).toBe(200);
    const listed = await json<{
      stages: { guidance_summary: unknown; guidance_by_profile: unknown[] }[];
    }>(await call("/api/stage-grants"));
    expect(listed.stages[0]?.guidance_summary).toEqual({ uniform: true, guidance: normalized });
    expect(listed.stages[0]?.guidance_by_profile).toHaveLength(2);
    expect((await update({ all: true, ...empty })).status).toBe(200);
    rows = await db.select().from(stageGrants);
    expect(rows.every((r) => r.sourceName === null && r.dueAt === null && r.message === null)).toBe(
      true,
    );
    const logs = await db.select().from(auditLogs);
    expect(logs.map((r) => r.action)).toEqual(Array(3).fill("stage_grants_guidance_update"));
    expect(logs[0]?.metadata).toMatchObject({
      profile_ids: ["learner"],
      all: false,
      ...normalized,
    });
  });
  it.each([
    { source_name: "あ".repeat(81) },
    { message: "あ".repeat(501) },
    { due_at: "2026-12-04" },
    { due_at: "2026-02-30T23:59:59+09:00" },
    { due_at: "invalid" },
    { due_at: "2026-12-04T12:00:00" },
    { due_at: 1 },
    { message: {} },
  ])("案内の不正な値を400にする: %j", async (invalid) => {
    await grant();
    expect((await update({ all: true, ...guidance, ...invalid })).status).toBe(400);
    expect((await db.select().from(stageGrants))[0]?.sourceName).toBeNull();
  });
  it("上限の文字数と過去の期限を受け付け、未割り当てと曖昧な対象は400にする", async () => {
    await grant();
    expect(
      (
        await update({
          all: true,
          source_name: "星".repeat(80),
          message: "星".repeat(500),
          due_at: "2000-01-01T23:59:59+09:00",
        })
      ).status,
    ).toBe(200);
    for (const target of [
      { profile_ids: ["other"] },
      { profile_ids: [] },
      { all: true, profile_ids: ["learner"] },
      {},
    ])
      expect((await update({ ...empty, ...target })).status).toBe(400);
  });
  it.each(["PATCH", "PUT"])(
    "%s: 全員同じ案内を新規割り当てへ継承し、既存の個別案内は保持する",
    async (method) => {
      await grant();
      await update({ all: true, ...guidance });
      const body = method === "PATCH" ? { add: ["other"] } : { profile_ids: ["learner", "other"] };
      expect((await call("/api/stage-grants/extra", method, body)).status).toBe(200);
      expect(
        (await db.select().from(stageGrants)).every((r) => r.dueAt === normalized.due_at),
      ).toBe(true);
      await update({ profile_ids: ["other"], ...empty });
      const next =
        method === "PATCH" ? { add: ["new"] } : { profile_ids: ["learner", "other", "new"] };
      expect((await call("/api/stage-grants/extra", method, next)).status).toBe(200);
      const rows = await db.select().from(stageGrants);
      expect(rows.find((r) => r.profileId === "new")?.sourceName).toBeNull();
      expect(rows.find((r) => r.profileId === "learner")?.sourceName).toBe(guidance.source_name);
    },
  );
  it("割り当てなし・他人だけの割り当ては空、免除・受講・修了を評価する", async () => {
    expect(await mine()).toEqual({ stages: [] });
    await grant("other");
    expect(await mine()).toEqual({ stages: [] });
    await grant();
    expect(await mine()).toMatchObject({
      stages: [
        { stage_id: "extra", status: "locked", prerequisite_titles: ["架空の入口"], ...empty },
      ],
    });
    await db
      .insert(stageUnlocks)
      .values({ userId: "learner", stageId: "extra", via: "staff", unlockedAt: new Date() });
    expect(await mine()).toMatchObject({
      stages: [{ status: "available", prerequisite_titles: [] }],
    });
    await db.insert(enrollments).values({ userId: "learner", stageId: "extra", status: "active" });
    expect(await mine()).toMatchObject({ stages: [{ status: "in-progress" }] });
    await db.update(enrollments).set({ status: "completed" });
    expect(await mine()).toEqual({ stages: [] });
  });
});

async function task(
  id: string,
  problemIds: string[] = [],
  extra: { active?: boolean; variantOf?: string } = {},
) {
  const definition = JSON.stringify({ problems: problemIds.map((id) => ({ id, title: id })) });
  await db.insert(tasks).values({
    id,
    sectionId: "unit-extra",
    title: "架空の課題",
    kind: "basic",
    pattern: "p",
    estimatedMinutes: 10,
    order: 0,
    contentHash: "current",
    definition,
    bundle: "{}",
    ...extra,
  });
  await db
    .insert(taskRevisions)
    .values({ taskId: id, contentHash: "current", definition, bundle: "{}" });
}
async function problem(
  taskId: string,
  problemId: string,
  contentHash: string,
  source: "tests" | "manual" = "tests",
  userId = "learner",
) {
  await db.insert(taskProblemResults).values({
    userId,
    taskId,
    problemId,
    contentHash,
    source,
    path: "a.ts",
    code: "",
    sha256: "x",
    firstPassedAt: new Date(),
    updatedAt: new Date(),
  });
}
it("問題の数・現行版の合格・引き継ぎを合計し、類題・無効・他人・消えた問題は数えない", async () => {
  await grant();
  await task("a", ["q1", "q2", "q3"]);
  await task("b", ["q1", "q2"]);
  await task("inactive", ["q1"], { active: false });
  await task("variant", ["q1"], { variantOf: "a" });
  await problem("a", "q1", "current", "manual");
  await problem("a", "q2", "old");
  await problem("a", "q3", "current", "tests", "other");
  await problem("a", "removed", "current");
  await problem("b", "q1", "old");
  await problem("b", "q2", "old", "manual");
  await db
    .insert(taskProgress)
    .values({ userId: "learner", taskId: "b", contentHash: "old", status: "passed" });
  expect(await mine()).toMatchObject({
    stages: [{ progress: { unit: "problems", passed: 3, total: 5 } }],
  });
});
it("問題が無ければ課題の合格を数え、手元の合格を含めない", async () => {
  await grant();
  await task("a");
  await task("b");
  await task("inactive", [], { active: false });
  await task("variant", [], { variantOf: "a" });
  await db
    .insert(taskProgress)
    .values({ userId: "learner", taskId: "a", contentHash: "old", status: "ai-passed" });
  await db
    .insert(taskProgress)
    .values({ userId: "learner", taskId: "b", contentHash: "current", status: "local-passed" });
  expect(await mine()).toMatchObject({
    stages: [{ progress: { unit: "tasks", passed: 1, total: 2 } }],
  });
});
it("割り当ての数を増やしても、読み取りの問い合わせ数は増えない", async () => {
  await grant();
  let queries = 0;
  const prepare = database.binding.prepare.bind(database.binding);
  database.binding.prepare = (sql) => {
    queries++;
    return prepare(sql);
  };
  await mine();
  const firstCount = queries;
  for (let i = 0; i < 12; i++) {
    await db.insert(stages).values({
      id: `extra-${i}`,
      slug: `sample-extra-${i}`,
      title: "架空の追加ステージ",
      audience: "granted",
      status: "published",
    });
    await grant("learner", `extra-${i}`);
  }
  queries = 0;
  expect((await mine()).stages).toHaveLength(13);
  expect(queries).toBe(firstCount);
});

describe("案内はフォーカスの自動導出から分ける (#201)", () => {
  async function start(stageId: string, time: number) {
    await db.insert(enrollments).values({ userId: "learner", stageId });
    await db
      .insert(lessonProgress)
      .values({ userId: "learner", lessonId: `lesson-${stageId}`, updatedAt: new Date(time) });
  }
  it("両方を受講中でも割り当てのない道を導き、選んだExtraのフォーカスは尊重する", async () => {
    await grant();
    await start("basic", 1000);
    await start("extra", 2000);
    const source = await loadSkillMapSource(db, caller);
    expect(source.activeStageId).toBe("basic");
    await db.insert(learnerFocus).values({ userId: "learner", activeStageId: "extra" });
    expect(await loadSkillMapSource(db, caller)).toMatchObject({
      activeStageId: "extra",
      activeStageSource: "chosen",
    });
  });
  it("案内だけ受講中ならフォーカスは無く、ホームの通常の道には未受講の入口が残る", async () => {
    await grant();
    await start("extra", 2000);
    expect((await loadSkillMapSource(db, caller)).activeStageId).toBeUndefined();
    const res = await call("/api/skill-map/mine?tiers=7", "GET", undefined, learner);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      skill_map: {
        has_enrollment: true,
        has_unguided_enrollment: false,
        unguided_next_stage_ids: ["basic"],
      },
    });
  });
  it("割り当てなしでは追加したホーム項目が従来の項目と一致する", async () => {
    const res = await call("/api/skill-map/mine?tiers=7", "GET", undefined, learner);
    const body = await json<{
      skill_map: {
        next_stage_ids: string[];
        unguided_next_stage_ids: string[];
        has_enrollment: boolean;
        has_unguided_enrollment: boolean;
      };
    }>(res);
    expect(body.skill_map.unguided_next_stage_ids).toEqual(body.skill_map.next_stage_ids);
    expect(body.skill_map.has_unguided_enrollment).toBe(body.skill_map.has_enrollment);
    expect(await db.select().from(stageGrants).where(eq(stageGrants.profileId, "learner"))).toEqual(
      [],
    );
  });
});

it.each(["PATCH", "PUT"])(
  "%s: 自動で足す祖先も、祖先自身の揃った案内を継承する",
  async (method) => {
    await db.insert(stages).values({
      id: "ancestor",
      slug: "sample-ancestor",
      title: "架空の前提",
      status: "published",
      audience: "granted",
    });
    await db
      .update(stages)
      .set({ prerequisites: '["sample-ancestor"]' })
      .where(eq(stages.id, "extra"));
    await db
      .insert(stageGrants)
      .values({ stageId: "ancestor", profileId: "other", sourceName: "架空の前提の案内" });
    const body = method === "PATCH" ? { add: ["learner"] } : { profile_ids: ["learner"] };
    expect((await call("/api/stage-grants/extra", method, body)).status).toBe(200);
    const rows = await db.select().from(stageGrants);
    expect(
      rows.find((r) => r.profileId === "learner" && r.stageId === "ancestor")?.sourceName,
    ).toBe("架空の前提の案内");
    expect(
      rows.find((r) => r.profileId === "learner" && r.stageId === "extra")?.sourceName,
    ).toBeNull();
  },
);

it("案内の一括更新・新規割り当ては、案内ありでもD1の100バインド以内に分ける", async () => {
  await grant();
  await update({ all: true, ...guidance });
  const ids: string[] = [];
  for (let i = 0; i < 110; i++) {
    const id = `bulk-${i}`;
    await db.insert(profiles).values({ id, displayName: "架空の追加受講者" });
    ids.push(id);
  }
  expect((await call("/api/stage-grants/extra", "PATCH", { add: ids })).status).toBe(200);
  expect((await db.select().from(stageGrants)).every((r) => r.dueAt === normalized.due_at)).toBe(
    true,
  );
  expect((await update({ all: true, ...empty })).status).toBe(200);
  expect((await db.select().from(stageGrants)).every((r) => r.dueAt === null)).toBe(true);
});

it("始められるExtraは従来の候補に残し、新しいホームの候補からは外す", async () => {
  await grant();
  await db
    .insert(stageUnlocks)
    .values({ userId: "learner", stageId: "extra", via: "staff", unlockedAt: new Date() });
  const body = await json<{
    skill_map: { next_stage_ids: string[]; unguided_next_stage_ids: string[] };
  }>(await call("/api/skill-map/mine?tiers=7", "GET", undefined, learner));
  expect(body.skill_map.next_stage_ids).toEqual(["basic", "extra"]);
  expect(body.skill_map.unguided_next_stage_ids).toEqual(["basic"]);
});

it("公開外のExtraの受講登録も、通常の道の集約に混ぜない", async () => {
  await grant();
  await db.insert(enrollments).values({ userId: "learner", stageId: "extra" });
  await db.update(stages).set({ status: "archived" }).where(eq(stages.id, "extra"));
  const body = await json<{
    skill_map: { has_enrollment: boolean; has_unguided_enrollment: boolean };
  }>(await call("/api/skill-map/mine?tiers=7", "GET", undefined, learner));
  expect(body.skill_map.has_enrollment).toBe(true);
  expect(body.skill_map.has_unguided_enrollment).toBe(false);
  expect(await mine()).toEqual({ stages: [] });
});

it("PUTの読み取り後に案内が更新されても、残る人の案内と割り当ての記録を保持する", async () => {
  await grant();
  await grant("other");
  await db
    .update(stageGrants)
    .set({ grantedBy: "other", grantedAt: new Date("2020-01-01T00:00:00Z") });
  expect((await update({ all: true, ...guidance })).status).toBe(200);
  const [before] = await db.select().from(stageGrants).where(eq(stageGrants.profileId, "learner"));
  const next = {
    source_name: "架空の新しい案内元",
    due_at: "2027-01-01T14:59:59.000Z",
    message: "架空の更新後の文",
  };
  const originalBatch = database.binding.batch.bind(database.binding);
  const batch = vi.spyOn(database.binding, "batch").mockImplementationOnce(async (statements) => {
    // PUTが読み取った後、書き込む直前に別リクエストの案内更新を完了させる。
    expect((await update({ all: true, ...next })).status).toBe(200);
    return originalBatch(statements);
  });
  try {
    expect(
      (await call("/api/stage-grants/extra", "PUT", { profile_ids: ["learner", "new"] })).status,
    ).toBe(200);
    const rows = await db.select().from(stageGrants);
    const retained = rows.find((row) => row.profileId === "learner");
    expect
      .soft(retained)
      .toMatchObject({ sourceName: next.source_name, dueAt: next.due_at, message: next.message });
    expect.soft(retained?.grantedAt).toEqual(before.grantedAt);
    expect.soft(retained?.grantedBy).toBe(before.grantedBy);
    expect(rows.map((row) => row.profileId).sort()).toEqual(["learner", "new"]);
  } finally {
    batch.mockRestore();
  }
});

it.each([false, true])(
  "案内の前提名は通常のスキルツリーと同じ範囲だけ返す (島で伏せる=%s)",
  async (hidden) => {
    await grant();
    if (hidden) await db.update(stages).set({ category: "AWS資格" }).where(eq(stages.id, "basic"));
    const response = await call("/api/skill-map/mine?tiers=7", "GET", undefined, learner);
    expect(response.status).toBe(200);
    const map = await json<{
      skill_map: { stages: { id: string; title?: string; lock_reasons?: string[] }[] };
    }>(response);
    const titles = map.skill_map.stages.flatMap((node) => [
      node.title,
      ...(node.lock_reasons ?? []),
    ]);
    expect(titles.includes("架空の入口")).toBe(!hidden);
    expect(await mine()).toMatchObject({
      stages: [{ status: "locked", prerequisite_titles: hidden ? [] : ["架空の入口"] }],
    });
  },
);

it("霧で名前を返さない遠い前提は、案内の前提名にも載せない", async () => {
  await grant();
  await db.insert(stages).values([
    {
      id: "middle",
      slug: "sample-middle",
      title: "架空の中継",
      status: "published",
      prerequisites: '["sample-basic"]',
    },
    {
      id: "far",
      slug: "sample-far",
      title: "架空の遠い前提",
      status: "published",
      prerequisites: '["sample-middle"]',
    },
  ]);
  await db.update(stages).set({ prerequisites: '["sample-far"]' }).where(eq(stages.id, "extra"));
  const map = await json<{ skill_map: { stages: { id: string; title?: string }[] } }>(
    await call("/api/skill-map/mine?tiers=7", "GET", undefined, learner),
  );
  expect(map.skill_map.stages.find((node) => node.id === "far")?.title).toBeUndefined();
  expect(await mine()).toMatchObject({ stages: [{ status: "locked", prerequisite_titles: [] }] });
});

it.each([false, true])(
  "複数の前提の名前を一部伏せたときは、存在だけを知らせる (伏せる=%s)",
  async (withheld) => {
    await grant();
    await db.insert(stages).values({
      id: "second-prerequisite",
      slug: "sample-second-prerequisite",
      title: "架空の別の前提",
      status: "published",
      category: withheld ? "AWS資格" : null,
    });
    await db
      .update(stages)
      .set({
        prerequisites: '["sample-basic","sample-second-prerequisite"]',
        parent: "sample-basic",
      })
      .where(eq(stages.id, "extra"));
    const response = await mine();
    expect(response.stages).toHaveLength(1);
    expect(response.stages[0]).toMatchObject({
      status: "locked",
      prerequisite_titles: withheld ? ["架空の入口"] : ["架空の入口", "架空の別の前提"],
      prerequisites_withheld: withheld,
    });
    if (withheld) {
      expect(JSON.stringify(response)).not.toContain("架空の別の前提");
      expect(response.stages[0]).not.toHaveProperty("prerequisites_withheld_count");
    }
  },
);
