import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { getDb } from "./client.js";
import { sections, stages, taskProgress, tasks, tenants } from "./schema.js";

const TAG = "0048_ai_first_review";
const SQL = readFileSync(
  fileURLToPath(new URL(`../../drizzle/${TAG}.sql`, import.meta.url)),
  "utf8",
);

describe("0048: 導入前の未判定の提出を AI の一次レビューの流れに載せる (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  beforeEach(async () => {
    // 直前のスキーマに実データを入れてから移行 SQL を当てる。submissions は列が足りないので SQL で入れる。
    database = sqliteD1({ beforeMigration: TAG });
    const db = getDb({ DB: database.binding } as Env);
    await db.insert(tenants).values({ id: "ses", name: "テスト" });
    // profiles は後の移行 (0049 の os_preference など) で列が増える。スキーマから insert すると
    // 移行前の DB に無い列まで書いてしまうので、この時点の列だけで入れる。
    database.sqlite.exec(`insert into profiles (id, tenant_id, role, display_name, created_at)
      values ('learner', 'ses', 'student', '受講者', 1)`);
    await db.batch([
      db
        .insert(stages)
        .values({ id: "stage", tenantId: "ses", slug: "dev-env-basics", title: "入口", format: 2 }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "単元" }),
      db.insert(tasks).values(
        (
          [
            ["page", "basic", "h"],
            ["check", "assessment-a", "h"],
            ["updated", "basic", "new"],
          ] as const
        ).map(([id, kind, contentHash], order) => ({
          id,
          sectionId: "unit",
          title: id,
          kind,
          pattern: "p",
          estimatedMinutes: 10,
          order,
          contentHash,
          definition: "{}",
          bundle: "{}",
        })),
      ),
      db
        .insert(taskProgress)
        .values({ userId: "learner", taskId: "check", status: "submitted", contentHash: "h" }),
    ]);
    const insert = database.sqlite.prepare(`
      insert into submissions (id, tenant_id, student_id, stage_title, assignment_title, code, task_id,
        task_kind, task_content_hash, machine_check, support_log, attempt, verdict, submitted_at)
      values (?, 'ses', 'learner', '入口', ?, '', ?, ?, 'h', ?, ?, ?, ?, 0)
    `);
    const matched = JSON.stringify({ matched: true, reasons: [] });
    // 同じ課題の古い試行・最新の試行・判定済み・照合の食い違い・確認Aの支援付き。
    insert.run("old", "課題", "page", "basic", matched, "[]", 1, null);
    insert.run("latest", "課題", "page", "basic", matched, "[]", 2, null);
    insert.run("decided", "課題", "page", "basic", matched, "[]", 0, "pass");
    insert.run(
      "support",
      "確認",
      "check",
      "assessment-a",
      matched,
      '[{"kind":"hint","at":"2026-10-05T00:00:00Z"}]',
      1,
      null,
    );
    // 教材の更新後に残った、古い課題の版への未判定の提出。
    insert.run("stale", "更新", "updated", "basic", matched, "[]", 1, null);
    database.sqlite.exec(`
      insert into task_private (task_id, files) values
        ('page', '{"review.md":"cGFnZQ=="}'), ('updated', '{"review.md":"bmV3"}');
    `);
    for (const statement of SQL.split("--> statement-breakpoint")) database.sqlite.exec(statement);
  });
  afterEach(() => database.sqlite.close());

  it("最新の未判定だけを AI の確認待ちにし、古い試行は置き換え済み・確認A・Bの支援付きは人に回す", () => {
    const rows = database.sqlite
      .prepare("select id, ai_review_status from submissions order by id")
      .all() as { id: string; ai_review_status: string | null }[];
    expect(Object.fromEntries(rows.map((r) => [r.id, r.ai_review_status]))).toEqual({
      decided: null,
      latest: "queued",
      old: "superseded",
      stale: "queued",
      support: "escalated",
    });
  });

  it("課題の版が今の版と同じ未判定の提出にだけ、今の素材を版として記録する", () => {
    const rows = database.sqlite
      .prepare("select id, task_private_hash from submissions order by id")
      .all() as { id: string; task_private_hash: string | null }[];
    expect(Object.fromEntries(rows.map((r) => [r.id, r.task_private_hash]))).toEqual({
      decided: null,
      latest: "migrated-h",
      old: "migrated-h",
      stale: null,
      support: null,
    });
    expect(
      database.sqlite
        .prepare("select task_id, private_hash, files from task_private_versions")
        .all(),
    ).toEqual([{ task_id: "page", private_hash: "migrated-h", files: '{"review.md":"cGFnZQ=="}' }]);
  });

  it("人に回したものも下書きのために待ち行列に積み、進捗を「講師の確認待ち」にそろえる", () => {
    const jobs = database.sqlite
      .prepare("select submission_id, state from ai_review_jobs order by submission_id")
      .all();
    expect(jobs).toEqual([
      { submission_id: "latest", state: "queued" },
      { submission_id: "stale", state: "queued" },
      { submission_id: "support", state: "queued" },
    ]);
    const progress = database.sqlite
      .prepare("select status from task_progress where task_id = 'check'")
      .get() as { status: string };
    expect(progress.status).toBe("instructor-pending");
  });
});
