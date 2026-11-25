import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mapStageToUi,
  type LessonRow,
  type SectionRow,
  type StageRow,
} from "@stella/shared/cms/types";
import { getDb } from "../db/client.js";
import {
  enrollments,
  lessons,
  profiles,
  sections,
  stages,
  taskProblemResults,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { tasksRoute } from "../routes/tasks.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { loadStageStepLocks } from "./task-problem-steps.js";

const CURRENT = "a".repeat(64);
const OLD = "b".repeat(64);
const NEWER = "c".repeat(64);
const FINGERPRINT = "d".repeat(64);

function stageRow(): StageRow {
  return {
    id: "stage",
    slug: "dev-env-basics",
    title: "使い方",
    category: null,
    color: null,
    duration_hours: null,
    description: null,
    status: "published",
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function lessonRow(sectionId: string, id: string, order: number, title: string): LessonRow {
  return {
    id,
    section_id: sectionId,
    title,
    type: "text",
    order,
    duration_label: null,
    video_path: null,
    pdf_path: null,
    markdown: null,
    assignment_id: null,
    total_pages: null,
    total_sec: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

/** 受講者のステージ詳細と同じ並び。同順は id で固定してから、画面の安定ソートにかける。 */
function learnerLessonIds(
  units: { id: string; order: number; lessons: { id: string; order: number; title: string }[] }[],
): string[] {
  const children = [...units]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((unit) => ({
      section: {
        id: unit.id,
        stage_id: "stage",
        title: unit.id,
        order: unit.order,
        created_at: "2026-01-01T00:00:00.000Z",
      } satisfies SectionRow,
      lessons: [...unit.lessons]
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((lesson) => lessonRow(unit.id, lesson.id, lesson.order, lesson.title)),
    }));
  return (mapStageToUi({ stage: stageRow(), sections: children }).sections ?? []).flatMap(
    (section) => section.lessons.map((lesson) => lesson.id),
  );
}

describe("問題の解放に使うレッスンの並び", () => {
  let database: ReturnType<typeof sqliteD1>;

  afterEach(() => database?.sqlite.close());

  it("単元の order が重なっても境目を崩さず、受講者のステージ詳細と同じ順になる", async () => {
    database = sqliteD1();
    const db = getDb({ DB: database.binding } as Env);
    const units = [
      {
        id: "m1",
        order: 1,
        lessons: [
          { id: "m1-a2", order: 0, title: "先の続き" },
          { id: "m1-b", order: 2, title: "先の後ろ" },
          { id: "m1-a", order: 0, title: "先" },
        ],
      },
      {
        id: "m2",
        order: 1,
        lessons: [
          { id: "m2-b", order: 2, title: "後の後ろ" },
          { id: "m2-a", order: 0, title: "後" },
        ],
      },
    ];
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(stages).values({
        id: "stage",
        slug: "dev-env-basics",
        title: "使い方",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values(
        units.map((unit) => ({
          id: unit.id,
          stageId: "stage",
          title: unit.id,
          order: unit.order,
        })),
      ),
      db.insert(lessons).values(
        units.flatMap((unit) =>
          unit.lessons.map((lesson) => ({
            id: lesson.id,
            sectionId: unit.id,
            title: lesson.title,
            type: "text" as const,
            order: lesson.order,
          })),
        ),
      ),
    ]);

    const locks = await loadStageStepLocks(db, "learner", "stage");
    const shown = learnerLessonIds(units);
    const interleaved = units
      .flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, sectionOrder: unit.order })))
      .sort(
        (a, b) => a.sectionOrder - b.sectionOrder || a.order - b.order || a.id.localeCompare(b.id),
      )
      .map((lesson) => lesson.id);

    expect(interleaved).not.toEqual(shown);
    expect(locks.steps.map((step) => step.id)).toEqual(shown);
    expect(shown).toEqual(["m1-a", "m1-a2", "m1-b", "m2-a", "m2-b"]);
  });
});

describe("旧版のコードを読むあいだの再提出", () => {
  let database: ReturnType<typeof sqliteD1>;

  afterEach(() => database?.sqlite.close());

  async function seed() {
    database = sqliteD1();
    const db = getDb({ DB: database.binding } as Env);
    const definition = JSON.stringify({
      runner: "node-test",
      problems: [{ id: "q1", title: "問1" }],
      skills: { assesses: [] },
    });
    const bundle = (hash: string) =>
      JSON.stringify({
        manifest: {
          id: "stage/unit/calc",
          schemaVersion: 1,
          title: "計算",
          kind: "basic",
          runner: "node-test",
          problems: [{ id: "q1", title: "問1" }],
          submit: { files: ["src/**/*.ts"] },
          checks: { lint: false, format: false },
        },
        contentHash: hash,
        files: { "src/q1.ts": Buffer.from("export const value = 0;\n").toString("base64") },
      });
    const passedAt = new Date("2026-11-01T00:00:00.000Z");
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values({ id: "learner", displayName: "受講者", role: "student" }),
      db.insert(stages).values({
        id: "stage",
        slug: "dev-env-basics",
        title: "使い方",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "計算", order: 0 }),
      db.insert(tasks).values({
        id: "stage/unit/calc",
        sectionId: "unit",
        title: "計算",
        kind: "basic",
        pattern: "calc",
        skills: { uses: [], assesses: [] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: CURRENT,
        definition,
        bundle: bundle(CURRENT),
      }),
      db.insert(taskRevisions).values([
        {
          taskId: "stage/unit/calc",
          contentHash: CURRENT,
          definition,
          bundle: bundle(CURRENT),
          problemHashes: JSON.stringify({ version: 2, hashes: { q1: FINGERPRINT } }),
        },
        {
          taskId: "stage/unit/calc",
          contentHash: OLD,
          definition,
          bundle: bundle(OLD),
          problemHashes: JSON.stringify({ version: 2, hashes: { q1: FINGERPRINT } }),
        },
      ]),
      db.insert(taskProblemResults).values({
        userId: "learner",
        taskId: "stage/unit/calc",
        problemId: "q1",
        contentHash: OLD,
        path: "src/q1.ts",
        code: "export const value = 1;\n",
        sha256: "e".repeat(64),
        attempts: 1,
        firstPassedAt: passedAt,
        updatedAt: passedAt,
      }),
    ]);
    return db;
  }

  it("版が変わっていなければ、同じ読み取りのコードで前の版を数える", async () => {
    const db = await seed();
    const locks = await loadStageStepLocks(db, "learner", "stage");
    expect(locks.byTask.get("stage/unit/calc")?.counted.has("q1")).toBe(true);
  });

  it("コードを読む前に再提出されたら、旧版に新しいコードを付けて数えない", async () => {
    const db = await seed();
    const original = database.binding.prepare.bind(database.binding);
    let armed = true;
    database.binding.prepare = ((sql: string) => {
      if (armed && sql.includes("task_problem_results") && sql.includes('"code"')) {
        armed = false;
        database.sqlite
          .prepare(
            `update task_problem_results
             set content_hash = ?, code = ?, updated_at = ?
             where user_id = ? and problem_id = ?`,
          )
          .run(NEWER, "export const value = 1;\n", Date.now(), "learner", "q1");
      }
      return original(sql);
    }) as typeof database.binding.prepare;

    const locks = await loadStageStepLocks(db, "learner", "stage");

    expect(armed).toBe(false);
    expect(locks.byTask.get("stage/unit/calc")?.counted.has("q1")).toBe(false);
    expect(locks.byTask.get("stage/unit/calc")?.saved[0]?.contentHash).toBe(NEWER);
  });
});

describe("after の無い課題の問題の状態", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let token: string;

  afterEach(() => database?.sqlite.close());

  async function seed() {
    database = sqliteD1();
    env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
    const db = getDb(env);
    const plainDefinition = JSON.stringify({
      runner: "node-test",
      problems: [
        { id: "q01", title: "足す" },
        { id: "q02", title: "引く" },
      ],
      skills: { assesses: [] },
    });
    const gatedDefinition = JSON.stringify({
      runner: "node-test",
      problems: [{ id: "q01", title: "足す", after: "video" }],
      skills: { assesses: [] },
    });
    const bundle = JSON.stringify({ files: {} });
    const passedAt = new Date("2026-11-01T00:00:00.000Z");
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values({ id: "learner", displayName: "受講者", role: "student" }),
      db.insert(stages).values({
        id: "stage",
        slug: "dev-env-basics",
        title: "使い方",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values([
        { id: "unit", stageId: "stage", title: "計算", order: 0 },
        { id: "later", stageId: "stage", title: "続き", order: 1 },
      ]),
      db.insert(enrollments).values({ userId: "learner", stageId: "stage", status: "active" }),
      db.insert(tasks).values([
        {
          id: "plain",
          sectionId: "unit",
          title: "計算",
          kind: "basic",
          pattern: "calc",
          skills: { uses: [], assesses: [] },
          estimatedMinutes: 10,
          order: 0,
          contentHash: CURRENT,
          definition: plainDefinition,
          bundle,
        },
        {
          id: "gated",
          sectionId: "later",
          title: "続き",
          kind: "basic",
          pattern: "calc",
          skills: { uses: [], assesses: [] },
          estimatedMinutes: 10,
          order: 0,
          contentHash: CURRENT,
          definition: gatedDefinition,
          bundle,
        },
      ]),
      db.insert(taskRevisions).values([
        {
          taskId: "plain",
          contentHash: CURRENT,
          definition: plainDefinition,
          bundle,
        },
        {
          taskId: "gated",
          contentHash: CURRENT,
          definition: gatedDefinition,
          bundle,
        },
      ]),
      db.insert(lessons).values([
        { id: "video", sectionId: "later", title: "動画", type: "video", order: 0 },
        {
          id: "step",
          sectionId: "later",
          title: "問1",
          type: "text",
          order: 1,
          problemTaskId: "gated",
          problemId: "q01",
        },
      ]),
      db.insert(taskProblemResults).values({
        userId: "learner",
        taskId: "plain",
        problemId: "q01",
        contentHash: CURRENT,
        path: "src/q01.ts",
        code: "export const add = 1;\n",
        sha256: "e".repeat(64),
        attempts: 1,
        firstPassedAt: passedAt,
        updatedAt: passedAt,
      }),
    ]);
    token = await signAccessToken("test-secret", "learner", "learner@example.com");
    return db;
  }

  function queries(spy: ReturnType<typeof vi.spyOn>): string[] {
    return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
  }

  it("after の無い課題は、その課題の結果だけを読み、ステージ全体は読まない", async () => {
    const db = await seed();
    void db;
    const prepare = vi.spyOn(database.binding, "prepare");
    const response = await request(
      mountTestApp(env, tasksRoute).app,
      env,
      "/api/tasks/problem-results?taskId=plain",
      { token },
    );
    expect(response.status).toBe(200);
    const body = await json<{
      gated?: true;
      passedProblems: number;
      totalProblems: number;
      problems: { id: string; status: string }[];
    }>(response);
    expect(body.gated).toBeUndefined();
    expect(body).toMatchObject({
      passedProblems: 1,
      totalProblems: 2,
      problems: [
        { id: "q01", status: "passed" },
        { id: "q02", status: "not-submitted" },
      ],
    });
    const resultQueries = queries(prepare).filter((sql) => sql.includes("task_problem_results"));
    expect(resultQueries.length).toBeGreaterThan(0);
    expect(resultQueries.every((sql) => sql.includes('"code"') && !sql.includes("sections"))).toBe(
      true,
    );
  });

  it("after のある課題は、これまでどおりステージの並びでロックを返す", async () => {
    await seed();
    const prepare = vi.spyOn(database.binding, "prepare");
    const response = await request(
      mountTestApp(env, tasksRoute).app,
      env,
      "/api/tasks/problem-results?taskId=gated",
      { token },
    );
    expect(response.status).toBe(200);
    const body = await json<{ gated?: true; problems: { id: string; state: string }[] }>(response);
    expect(body.gated).toBe(true);
    expect(body.problems[0]).toMatchObject({ id: "q01", state: "locked-video" });
    expect(
      queries(prepare).some(
        (sql) => sql.includes("task_problem_results") && sql.includes("sections"),
      ),
    ).toBe(true);
  });
});
