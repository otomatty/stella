import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IntegrationProgress, IntegrationEvent } from "@stella/shared/integrations/types";
import { Hono } from "hono";
import { getDb } from "../db/client.js";
import {
  integrationClients,
  integrationGroups,
  integrationGroupMembers,
  integrationGroupStages,
  profiles,
  stages,
  sections,
  tasks,
  enrollments,
  taskProgress,
  taskProblemResults,
  submissions,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { checkAiPassedSubmission } from "../lib/review-desk.js";
import { newIntegrationToken } from "../lib/integrations.js";
import { manualCompletionCounts } from "../lib/task-completion.js";
import { encodePosition } from "../lib/integration-read.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { integrationsRoute } from "./integrations.js";

const T0 = Date.parse("2026-11-01T00:00:00Z"),
  T1 = T0 + 1000,
  T2 = T1 + 1000;
type Events = { events: IntegrationEvent[]; next: string | null; hasMore: boolean };
describe("連携の読み取り (架空データ・実SQLite)", () => {
  let sqlite: ReturnType<typeof sqliteD1>;
  let env: Env;
  let token: string;
  const app = new Hono().route("/", integrationsRoute);
  const read = (path: string, bearer = token) =>
    app.request(
      `/api/integrations/v1/groups/sample/${path}`,
      { headers: { Authorization: `Bearer ${bearer}` } },
      env,
    );
  const progress = async (q = "") => {
    const r = await read(`progress${q}`);
    expect(r.status, await r.clone().text()).toBe(200);
    return r.json() as Promise<IntegrationProgress>;
  };
  const events = async (q = "") => {
    const r = await read(`events${q}`);
    expect(r.status, await r.clone().text()).toBe(200);
    return r.json() as Promise<Events>;
  };
  beforeEach(async () => {
    sqlite = sqliteD1();
    env = { DB: sqlite.binding } as Env;
    sqlite.sqlite.exec(
      "INSERT INTO tenants(id,name,active_count,active,created_at,updated_at) VALUES ('ses','fixture',0,1,1,1)",
    );
    const db = getDb(env),
      issued = await newIntegrationToken();
    token = issued.token;
    await db.insert(profiles).values(
      ["inside", "outside"].map((id) => ({
        id,
        email: `${id}@example.test`,
        displayName: id,
        role: "student" as const,
      })),
    );
    await db.insert(integrationClients).values({
      id: "client",
      name: "fixture",
      ...{ tokenHash: issued.tokenHash, tokenPrefix: issued.tokenPrefix },
      scopes: ["progress:read", "events:read"],
    });
    await db
      .insert(integrationGroups)
      .values({ id: "group", clientId: "client", key: "sample", name: "fixture" });
    await db
      .insert(integrationGroupMembers)
      .values({ groupId: "group", profileId: "inside", externalId: "external-1" });
    await db
      .insert(stages)
      .values(
        ["stage", "other"].map((id) => ({ id, slug: id, title: id, audience: "granted" as const })),
      );
    await db.insert(integrationGroupStages).values({ groupId: "group", stageId: "stage" });
    await db.insert(sections).values(
      ["stage", "other"].map((id) => ({
        id: `unit-${id}`,
        stageId: id,
        title: `unit-${id}`,
        order: 1,
      })),
    );
    await db.insert(tasks).values(
      ["stage", "other"].map((id) => ({
        id: `task-${id}`,
        sectionId: `unit-${id}`,
        title: `task-${id}`,
        kind: "practice",
        pattern: "implementation",
        estimatedMinutes: 1,
        order: 1,
        contentHash: "current",
        definition: JSON.stringify({
          problems: [
            { id: "q1", title: "問1" },
            { id: "q2", title: "問2" },
          ],
        }),
        bundle: "{}",
      })),
    );
    for (const [userId, stageId] of [
      ["inside", "stage"],
      ["outside", "stage"],
      ["inside", "other"],
    ]) {
      await db.insert(enrollments).values({
        userId,
        stageId,
        enrolledAt: new Date(T0),
        completedAt: new Date(T2),
        status: "completed",
      });
      await db.insert(taskProgress).values({
        userId,
        taskId: `task-${stageId}`,
        contentHash: "current",
        status: "passed",
        passedAt: new Date(T2),
      });
      await db.insert(submissions).values({
        id: `pass-${userId}-${stageId}`,
        studentId: userId,
        taskId: `task-${stageId}`,
        stageTitle: stageId,
        assignmentTitle: "fixture",
        code: "PRIVATE CODE",
        reviewNotes: "PRIVATE REVIEW",
        reviewSource: "manual",
        verdict: "pass",
        status: "passed",
        submittedAt: new Date(T1),
        reviewedAt: new Date(T2),
      });
      await db.insert(taskProblemResults).values(
        ["q1", "q2", "removed"].map((problemId, i) => ({
          userId,
          taskId: `task-${stageId}`,
          problemId,
          contentHash: "old",
          path: "PRIVATE PATH",
          code: "PRIVATE CODE",
          sha256: "hash",
          source: "manual" as const,
          manualReason: "PRIVATE REASON",
          firstPassedAt: new Date(i === 0 ? T1 : T2),
          updatedAt: new Date(i === 0 ? T1 : T2),
        })),
      );
    }
  });
  afterEach(() => sqlite.sqlite.close());
  it("グループと設定ステージだけ。現在の単元・課題・問題・出所は成績台帳の手動集計と一致", async () => {
    const body = await progress();
    expect(body.members).toHaveLength(1);
    const m = body.members[0];
    expect(m).toMatchObject({
      id: "inside",
      externalId: "external-1",
      lastActiveDate: "2026-11-01",
    });
    const stage = m?.stages[0];
    expect(stage).toMatchObject({
      slug: "stage",
      status: "cleared",
      startedAt: new Date(T0).toISOString(),
      clearedAt: new Date(T2).toISOString(),
    });
    expect(stage?.units[0]?.tasks[0]).toMatchObject({
      status: "passed",
      pendingReview: false,
      passed: true,
      source: "manual",
      problems: { total: 2, passed: 2, sources: ["manual"] },
      submissionUrl: "/submissions/pass-inside-stage",
    });
    expect(stage?.progressUrl).toBe("/task-manual-completion?userId=inside&stageId=stage");
    const counts = await manualCompletionCounts(getDb(env), "stage", ["inside"]);
    expect(counts.get("inside")).toEqual({
      manual_tasks: 1,
      manual_problems: stage?.units[0]?.tasks[0]?.problems?.passed,
    });
    expect((await progress("?stage=other")).members[0]?.stages).toEqual([]);
    for (const forbidden of [
      "PRIVATE",
      "outside",
      '"other"',
      "study_activity",
      "watchedSec",
      "reviewNotes",
      "aiSuggestions",
      "manualReason",
    ])
      expect(JSON.stringify(body)).not.toContain(forbidden);
    expect((await read("progress")).headers.get("cache-control")).toBe("no-store");
  });
  it("at は後の合格・開始・修了を数えず、復元不能な現在の状態を省く", async () => {
    const before = await progress(`?at=${new Date(T0 - 1).toISOString()}`);
    expect(before.members[0]?.stages[0]).toMatchObject({
      status: "assigned",
      startedAt: null,
      clearedAt: null,
    });
    const middle = await progress(`?at=${new Date(T1).toISOString()}`);
    const stage = middle.members[0]?.stages[0];
    expect(stage).toMatchObject({ status: "started", clearedAt: null });
    expect(stage?.units[0]?.tasks[0]).toMatchObject({
      passed: false,
      passedAt: null,
      source: null,
      problems: { total: 2, passed: 0 },
    }); // 未合格の旧版の問題は数えない。
    expect(JSON.stringify(middle)).not.toContain("pendingReview");
    expect(middle.members[0]).not.toHaveProperty("lastActiveDate");
    expect(stage?.units[0]?.tasks[0]).not.toHaveProperty("status");
    sqlite.sqlite.exec(
      "update task_problem_results set content_hash='current' where problem_id='q1'",
    );
    const same = await progress(`?at=${new Date(T1).toISOString()}`);
    expect(same.members[0]?.stages[0]?.units[0]?.tasks[0]?.problems?.passed).toBe(1);
    expect((await read("progress?at=2026-02-30T00:00:00Z")).status).toBe(400);
    expect((await read("progress?at=2026-11-01")).status).toBe(400);
  });
  it.each(["tests", "ai", "human", "manual"] as const)(
    "合格の出所 %s を保ち、今の版の問題だけを数える",
    async (source) => {
      sqlite.sqlite
        .prepare("update submissions set review_source=? where id='pass-inside-stage'")
        .run(source);
      expect(
        (await progress("?stage=stage")).members[0]?.stages[0]?.units[0]?.tasks[0]?.source,
      ).toBe(source);
      sqlite.sqlite.exec(
        "update task_progress set status='instructor-pending' where user_id='inside' and task_id='task-stage'",
      );
      const task = (await progress()).members[0]?.stages[0]?.units[0]?.tasks[0];
      expect(task).toMatchObject({
        status: "instructor-pending",
        pendingReview: true,
        passed: false,
        source: null,
        problems: { total: 2, passed: 0 },
      });
      sqlite.sqlite.exec(
        "update task_problem_results set content_hash='current',source='tests' where user_id='inside' and task_id='task-stage' and problem_id='q1'",
      );
      const at = await progress(`?at=${new Date(T1).toISOString()}`);
      expect(at.members[0]?.stages[0]?.units[0]?.tasks[0]?.problems).toMatchObject({
        total: 2,
        passed: 1,
        sources: ["tests"],
      });
      const later = await progress(`?at=${new Date(T2).toISOString()}`);
      expect(later.members[0]?.stages[0]?.units[0]?.tasks[0]).toMatchObject({
        passed: true,
        source,
        problems: { total: 2, passed: 2 },
      });
    },
  );
  it("締切後に AI 合格を人が覆しても、at は締切時点の合格と出所を保つ", async () => {
    const db = getDb(env);
    await db.insert(profiles).values({ id: "teacher", displayName: "架空の管理者", role: "admin" });
    sqlite.sqlite.exec(
      "update submissions set review_source='ai',task_content_hash='current' where id='pass-inside-stage'",
    );
    const deadline = T2 + 1000;
    const snapshot = (await progress(`?at=${new Date(deadline).toISOString()}`)).members[0]
      ?.stages[0]?.units[0]?.tasks[0];
    expect(snapshot).toMatchObject({
      passed: true,
      passedAt: new Date(T2).toISOString(),
      source: "ai",
      submissionUrl: "/submissions/pass-inside-stage",
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(T2 + 2000));
    try {
      await checkAiPassedSubmission(
        db,
        { id: "teacher", name: "架空の管理者", role: "admin", email: null },
        "pass-inside-stage",
        { action: "overturn", comment: "架空の訂正理由" },
      );
    } finally {
      vi.useRealTimers();
    }
    expect(
      sqlite.sqlite.prepare("select verdict from submissions where id='pass-inside-stage'").get()
        ?.verdict,
    ).toBe("resubmit");
    expect(
      sqlite.sqlite
        .prepare(
          "select passed_at from task_progress where user_id='inside' and task_id='task-stage'",
        )
        .get()?.passed_at,
    ).toBeNull();
    expect((await events()).events).toContainEqual(
      expect.objectContaining({
        type: "task_returned",
        taskId: "task-stage",
        occurredAt: new Date(T2 + 2000).toISOString(),
      }),
    );
    const historical = (await progress(`?at=${new Date(deadline).toISOString()}`)).members[0]
      ?.stages[0]?.units[0]?.tasks[0];
    expect(historical).toEqual(snapshot);
    expect((await progress()).members[0]?.stages[0]?.units[0]?.tasks[0]).toMatchObject({
      passed: false,
      passedAt: null,
      source: null,
    });
    expect(
      (await progress(`?at=${new Date(T2 + 2000).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0],
    ).toMatchObject({ passed: false, passedAt: null, source: null });
  });
  it("締切後に問題を manual から tests に解き直しても、at は manual の合格を数える", async () => {
    sqlite.sqlite.exec(
      "update task_problem_results set content_hash='current' where user_id='inside' and task_id='task-stage' and problem_id='q1'",
    );
    const deadline = T1 + 500;
    const snapshot = (await progress(`?at=${new Date(deadline).toISOString()}`)).members[0]
      ?.stages[0]?.units[0]?.tasks[0]?.problems;
    expect(snapshot).toEqual({ total: 2, passed: 1, sources: ["manual"] });
    sqlite.sqlite
      .prepare(
        "update task_problem_results set source='tests',first_passed_at=?,updated_at=? where user_id='inside' and task_id='task-stage' and problem_id='q1'",
      )
      .run(T2 + 1000, T2 + 1000);
    const historical = (await progress(`?at=${new Date(deadline).toISOString()}`)).members[0]
      ?.stages[0]?.units[0]?.tasks[0]?.problems;
    expect(historical).toEqual(snapshot);
    expect((await progress()).members[0]?.stages[0]?.units[0]?.tasks[0]?.problems).toMatchObject({
      passed: 2,
      sources: expect.arrayContaining(["tests"]),
    });
  });
  it("at は試行番号や現在の passedAt によらず、課題の最新のできごとで合否と日時を決める", async () => {
    const db = getDb(env);
    const review = async (
      id: string,
      verdict: "pass" | "resubmit",
      time: number,
      attempt: number,
    ) =>
      db.insert(submissions).values({
        id,
        studentId: "inside",
        taskId: "task-stage",
        stageTitle: "stage",
        assignmentTitle: "fixture",
        code: "PRIVATE",
        verdict,
        reviewSource: "human",
        attempt,
        reviewedAt: new Date(time),
      });
    // 試行番号が大きくても、出来事の日時が古ければ最新の合格にはしない。
    await review("older-pass", "pass", T1, 10);
    expect(
      (await progress(`?at=${new Date(T2).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0],
    ).toMatchObject({
      passed: true,
      source: "manual",
      passedAt: new Date(T2).toISOString(),
      submissionUrl: "/submissions/pass-inside-stage",
    });
    await review("new-return", "resubmit", T2 + 500, 11);
    const returned = (await progress(`?at=${new Date(T2 + 500).toISOString()}`)).members[0]
      ?.stages[0]?.units[0]?.tasks[0];
    expect(returned).toMatchObject({ passed: false, passedAt: null, source: null });
    expect(returned).not.toHaveProperty("submissionUrl");
    await review("new-pass", "pass", T2 + 1000, 12);
    expect(
      (await progress(`?at=${new Date(T2 + 1000).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0],
    ).toMatchObject({
      passed: true,
      source: "human",
      passedAt: new Date(T2 + 1000).toISOString(),
      submissionUrl: "/submissions/new-pass",
    });
    // 同時刻は索引への追記順。繰り返し読んでも最後の出来事で判定する。
    await review("same-time-return", "resubmit", T2 + 1000, 13);
    const query = `?at=${new Date(T2 + 1000).toISOString()}`;
    const snapshot = await progress(query);
    expect(snapshot.members[0]?.stages[0]?.units[0]?.tasks[0]).toMatchObject({
      passed: false,
      passedAt: null,
      source: null,
    });
    expect(await progress(query)).toEqual(snapshot);
  });
  it("at は問題の版ごとに締切以前の最新の出所を使い、削除済みの結果は数えない", async () => {
    sqlite.sqlite.exec(
      "update task_problem_results set content_hash='current' where user_id='inside' and task_id='task-stage' and problem_id='q1'",
    );
    sqlite.sqlite
      .prepare(
        "update task_problem_results set source='tests',updated_at=? where user_id='inside' and task_id='task-stage' and problem_id='q1'",
      )
      .run(T1 + 100);
    const cutoff = T1 + 200;
    expect(
      (await progress(`?at=${new Date(cutoff).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0]?.problems,
    ).toEqual({ total: 2, passed: 1, sources: ["tests"] });
    sqlite.sqlite
      .prepare(
        "update task_problem_results set content_hash='next',source='manual',updated_at=? where user_id='inside' and task_id='task-stage' and problem_id='q1'",
      )
      .run(T2 + 1000);
    expect(
      (await progress(`?at=${new Date(cutoff).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0]?.problems,
    ).toEqual({ total: 2, passed: 1, sources: ["tests"] });
    expect(
      (await progress(`?at=${new Date(T2 + 1000).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0]?.problems,
    ).toEqual({ total: 2, passed: 2, sources: ["manual"] });
    sqlite.sqlite.exec(
      "delete from task_problem_results where user_id='inside' and task_id='task-stage' and problem_id='q1'",
    );
    expect(
      (await progress(`?at=${new Date(cutoff).toISOString()}`)).members[0]?.stages[0]?.units[0]
        ?.tasks[0]?.problems,
    ).toEqual({ total: 2, passed: 0, sources: [] });
  });
  it("同じ行の再保存で出来事を増やさず、失敗したbatchは出来事も戻す", async () => {
    const initial = await events();
    sqlite.sqlite.exec(
      "update submissions set review_notes='changed PRIVATE REVIEW' where id='pass-inside-stage'",
    );
    sqlite.sqlite.exec("update enrollments set status='completed' where user_id='inside'");
    expect(await events()).toEqual(initial);
    await expect(
      sqlite.binding.batch([
        sqlite.binding
          .prepare(
            "update submissions set verdict='resubmit',reviewed_at=? where id='pass-inside-stage'",
          )
          .bind(T2 + 1000),
        sqlite.binding.prepare(
          "insert into integration_group_members(group_id,profile_id) values ('missing','inside')",
        ),
      ]),
    ).rejects.toThrow();
    expect(await events()).toEqual(initial);
  });
  it("出来事は日時順、問題をまとめ、出し直しも返す。再取得と更新後もIDが安定", async () => {
    const before = await events();
    expect(before.events.map((e) => e.type).sort()).toEqual(
      [
        "stage_started",
        "stage_cleared",
        "task_passed",
        "problems_passed",
        "problems_passed",
      ].sort(),
    );
    expect(before.events.map((e) => e.occurredAt)).toEqual(
      before.events.map((e) => e.occurredAt).sort(),
    );
    expect(before.events.filter((e) => e.type === "problems_passed").map((e) => e.count)).toEqual([
      1, 2,
    ]);
    expect(before.events.find((e) => e.type === "task_passed")).toMatchObject({
      source: "manual",
      person: { id: "inside", externalId: "external-1" },
      taskId: "task-stage",
    });
    expect(await events()).toEqual(before);
    expect(await events(`?after=${before.next}`)).toEqual({
      events: [],
      next: before.next,
      hasMore: false,
    });
    sqlite.sqlite.exec(
      `update submissions set verdict='resubmit',status='resubmit',reviewed_at=${T2 + 1000} where id='pass-inside-stage'`,
    );
    const after = await events(`?after=${before.next}`);
    expect(after.events).toHaveLength(1);
    expect(after.events[0]?.type).toBe("task_returned");
    expect((await events()).events.slice(0, before.events.length)).toEqual(before.events);
    expect(await events(`?after=${before.next}`)).toEqual(after);
    for (const forbidden of ["PRIVATE", "outside", '"other"', "study_activity"])
      expect(JSON.stringify(after)).not.toContain(forbidden);
  });
  it("未所属の人の INSERT・UPDATE では、どの出来事も書き込まない", async () => {
    const before = await events();
    const count = sqlite.sqlite.prepare("select count(*) n from integration_events").get()?.n;
    expect(
      sqlite.sqlite
        .prepare("select count(*) n from integration_events where user_id='outside'")
        .get()?.n,
    ).toBe(0);
    const db = getDb(env);
    await db.insert(enrollments).values({
      userId: "outside",
      stageId: "other",
      enrolledAt: new Date(T2 + 1000),
      completedAt: new Date(T2 + 2000),
    });
    sqlite.sqlite
      .prepare(
        "update enrollments set enrolled_at=?,completed_at=? where user_id='outside' and stage_id='stage'",
      )
      .run(T2 + 1000, T2 + 2000);
    for (const verdict of ["pass", "resubmit"] as const) {
      await db.insert(submissions).values({
        studentId: "outside",
        taskId: "task-stage",
        stageTitle: "stage",
        assignmentTitle: "fixture",
        code: "PRIVATE",
        verdict,
        reviewSource: "human",
        reviewedAt: new Date(T2 + 3000),
      });
    }
    sqlite.sqlite
      .prepare(
        "update submissions set verdict='resubmit',reviewed_at=? where id='pass-outside-stage'",
      )
      .run(T2 + 4000);
    sqlite.sqlite
      .prepare("update submissions set verdict='pass',reviewed_at=? where id='pass-outside-stage'")
      .run(T2 + 5000);
    await db.insert(taskProblemResults).values({
      userId: "outside",
      taskId: "task-stage",
      problemId: "q3",
      contentHash: "current",
      path: "PRIVATE",
      code: "PRIVATE",
      sha256: "hash",
      firstPassedAt: new Date(T2 + 6000),
      updatedAt: new Date(T2 + 6000),
    });
    sqlite.sqlite
      .prepare(
        "update task_problem_results set content_hash='next',source='tests',updated_at=? where user_id='outside'",
      )
      .run(T2 + 7000);
    expect(
      sqlite.sqlite
        .prepare("select count(*) n from integration_events where user_id='outside'")
        .get()?.n,
    ).toBe(0);
    expect(sqlite.sqlite.prepare("select count(*) n from integration_events").get()?.n).toBe(count);
    expect(await events()).toEqual(before);
  });
  it("メンバー追加で過去分を埋めず、progress は現在の状態を返し、参加後の出来事だけ読める", async () => {
    const before = await events();
    sqlite.sqlite.exec(
      `update integration_clients set scopes='["progress:read","events:read","members:write"]'`,
    );
    const response = await app.request(
      "/api/integrations/v1/groups/sample/members",
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          members: [{ email: "outside@example.test", externalId: "external-2" }],
        }),
      },
      env,
    );
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.json()).toMatchObject({
      results: [{ id: "outside", status: "existing" }],
    });
    expect(await events()).toEqual(before);
    const person = (await progress()).members.find((m) => m.id === "outside");
    expect(person?.stages[0]?.units[0]?.tasks[0]).toMatchObject({
      passed: true,
      problems: { total: 2, passed: 2 },
    });
    // 参加前の行にある、出来事ではない項目の再保存でも過去分を書かない。
    sqlite.sqlite.exec("update enrollments set status='completed' where user_id='outside'");
    sqlite.sqlite.exec(
      "update submissions set review_notes='PRIVATE CHANGED' where student_id='outside'",
    );
    sqlite.sqlite.exec(
      "update task_problem_results set code='PRIVATE CHANGED' where user_id='outside'",
    );
    expect(await events()).toEqual(before);
    sqlite.sqlite
      .prepare(
        "update submissions set verdict='resubmit',reviewed_at=? where id='pass-outside-stage'",
      )
      .run(T2 + 1000);
    const after = await events(`?after=${before.next}`);
    expect(after.events).toHaveLength(1);
    expect(after.events[0]).toMatchObject({
      type: "task_returned",
      person: { id: "outside", externalId: "external-2" },
      occurredAt: new Date(T2 + 1000).toISOString(),
    });
    expect(
      sqlite.sqlite
        .prepare("select count(*) n from integration_events where user_id='outside'")
        .get()?.n,
    ).toBe(1);
  });
  it("200人・500件でページング。大人数でも100バインドを超えない。同時刻の安定IDで続く", async () => {
    const db = getDb(env);
    for (let i = 0; i < 201; i++) {
      const id = `fixture-${String(i).padStart(3, "0")}`;
      await db.insert(profiles).values({ id, email: `${id}@example.test`, displayName: id });
      await db.insert(integrationGroupMembers).values({ groupId: "group", profileId: id });
      await db.insert(enrollments).values({
        userId: id,
        stageId: "stage",
        enrolledAt: new Date(T0),
        completedAt: new Date(T2),
      });
      await db.insert(submissions).values({
        studentId: id,
        taskId: "task-stage",
        stageTitle: "stage",
        assignmentTitle: "fixture",
        code: "PRIVATE",
        verdict: "pass",
        reviewSource: "tests",
        reviewedAt: new Date(T2),
      });
    }
    const p1 = await progress();
    expect(p1.members).toHaveLength(200);
    expect(p1.hasMore).toBe(true);
    const p2 = await progress(`?cursor=${p1.next}`);
    expect(p2.members).toHaveLength(2);
    expect(p2.hasMore).toBe(false);
    expect(new Set([...p1.members, ...p2.members].map((m) => m.id)).size).toBe(202);
    const e1 = await events();
    expect(e1.events).toHaveLength(500);
    expect(e1.hasMore).toBe(true);
    const e2 = await events(`?after=${e1.next}`);
    expect(e2.events.length).toBe(108);
    expect(e2.hasMore).toBe(false);
    expect(new Set([...e1.events, ...e2.events].map((e) => e.id)).size).toBe(608);
    expect(await events(`?after=${e1.next}`)).toEqual(e2);
    expect((await read(`progress?stage=other&cursor=${p1.next}`)).status).toBe(400);
  });
  it("scope無しは403、他の所有者は404。不正な位置は400で監査・no-storeを保つ", async () => {
    const db = getDb(env);
    sqlite.sqlite.exec("update integration_clients set scopes='[]'");
    for (const path of ["progress?at=bad", "events?after=bad"])
      expect((await read(path)).status).toBe(403);
    sqlite.sqlite.exec('update integration_clients set scopes=\'["progress:read","events:read"]\'');
    const issued = await newIntegrationToken();
    await db.insert(integrationClients).values({
      id: "other-client",
      name: "other",
      tokenHash: issued.tokenHash,
      tokenPrefix: issued.tokenPrefix,
      scopes: ["progress:read", "events:read"],
    });
    for (const path of ["progress", "events"])
      expect((await read(path, issued.token)).status).toBe(404);
    for (const path of [
      "progress?cursor=bad",
      "events?after=bad",
      `events?after=${encodePosition(["events-v1", "other-group", 1, "id"])}`,
    ])
      expect((await read(path)).status).toBe(400);
    expect(
      sqlite.sqlite
        .prepare("select count(*) n from audit_logs where action='integration_request'")
        .get()?.n,
    ).toBe(7);
  });
});
