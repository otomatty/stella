import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  DEVLAB_TASK_PROBLEM_MOVES,
  taskProblemCarryoverStatements,
} from "./task-problem-carryover.js";

const stageId = "devlab-ts-ch01";
const from = `${stageId}/u99-problems/chapter`;
const moves = [{ from, stageId }];
const firstId = `${stageId}/u01-let-const/q01`;
const secondId = `${stageId}/u02-type-annotation/q02`;

function task(id: string, problemIds: string[], hash = "new-hash") {
  return {
    stageId,
    definition: { id, problems: problemIds.map((id) => ({ id, title: id })) },
    bundle: { contentHash: hash },
  };
}

const first = task(firstId, ["q01-01", "q01-02"], "first-hash");
const second = task(secondId, ["q02-01"], "second-hash");

describe("taskProblemCarryoverStatements", () => {
  it("開発ラボG の 01〜09 章を対象にする", () => {
    expect(DEVLAB_TASK_PROBLEM_MOVES).toHaveLength(9);
    for (const [index, move] of DEVLAB_TASK_PROBLEM_MOVES.entries()) {
      const chapter = `devlab-ts-ch0${index + 1}`;
      expect(move).toEqual({ stageId: chapter, from: `${chapter}/u99-problems/chapter` });
    }
  });

  it("旧課題が教材に残っている章は移さない", () => {
    expect(taskProblemCarryoverStatements(moves, [first, task(from, ["q01-01"])])).toEqual([]);
  });

  it("移し先ごとの問題 ID を使い、類題・別ステージ・問題の無い課題を除く", () => {
    const statements = taskProblemCarryoverStatements(moves, [
      first,
      { ...task("variant", ["variant-problem"]), variantOf: firstId },
      { ...task("other", ["other-stage-problem"]), stageId: "devlab-ts-ch02" },
      { ...task("without-problems", []), definition: { id: "without-problems" } },
      second,
    ]);
    expect(statements).toHaveLength(6);
    for (const sql of statements.slice(0, 3)) {
      expect(sql).toContain(firstId);
      expect(sql).toContain("src.problem_id in ('q01-01', 'q01-02')");
      expect(sql).not.toContain("q02-01");
    }
    for (const sql of statements.slice(3)) {
      expect(sql).toContain(secondId);
      expect(sql).toContain("src.problem_id in ('q02-01')");
      expect(sql).not.toContain("q01-01");
    }
  });

  it("現行版の結果を移し、既存の結果と進捗を保持し、再実行で取り消しを戻さない", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`
        create table profiles (id text primary key);
        create table sections (id text primary key);
        create table stages (id text primary key);
        create table quizzes (id text primary key);
        create table quiz_questions (id text primary key);
        insert into profiles values ('alice'), ('bob'), ('carol');
        insert into sections values ('unit');
      `);
      for (const tag of [
        "0043_format_2_content",
        "0044_learning_pace",
        "0072_task_problem_results",
        "0076_manual_task_completion",
      ]) {
        const migration = readFileSync(
          new URL(`../../../apps/api/drizzle/${tag}.sql`, import.meta.url),
          "utf8",
        );
        // 0044 のうち、学習ペース用の表ではなく課題の進捗に関わる変更だけを適用する。
        db.exec(
          tag.startsWith("0044")
            ? migration.slice(migration.indexOf("ALTER TABLE task_progress"))
            : migration,
        );
      }
      const insertTask = db.prepare(`
        insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle, active)
        values (?, 'unit', '', '', '', '[]', 1, 0, ?, '{}', '{}', ?)
      `);
      insertTask.run(firstId, "first-hash", 1);
      insertTask.run(secondId, "second-hash", 1);
      const statements = taskProblemCarryoverStatements(moves, [first, second]);
      const runCarryover = (sqlStatements = statements) =>
        sqlStatements.map((sql) => Number(db.prepare(sql).run().changes));
      const result = db.prepare(`
        insert into task_problem_results
          (user_id, task_id, problem_id, content_hash, path, code, sha256, source, manual_reason, manual_by, manual_at, attempts, first_passed_at, updated_at)
        values (?, ?, ?, ?, 'src/problem.ts', ?, 'sha', ?, ?, ?, ?, 3, 1000, 2000)
      `);
      result.run("alice", firstId, "q01-02", "first-hash", "existing", "tests", null, null, null);
      expect(runCarryover()).toEqual([0, 0, 0, 0, 0, 0]);

      insertTask.run(from, "old-current-hash", 0);
      result.run(
        "alice",
        from,
        "q01-01",
        "old-current-hash",
        "carried",
        "manual",
        "理由",
        "admin",
        1500,
      );
      result.run(
        "alice",
        from,
        "q01-02",
        "old-current-hash",
        "superseded",
        "tests",
        null,
        null,
        null,
      );
      result.run("bob", from, "q01-01", "old-current-hash", "bob", "tests", null, null, null);
      result.run("bob", from, "q02-01", "old-current-hash", "second", "tests", null, null, null);
      result.run("carol", from, "q02-01", "old-stale-hash", "stale", "tests", null, null, null);
      result.run(
        "carol",
        from,
        "removed",
        "old-current-hash",
        "unmatched",
        "tests",
        null,
        null,
        null,
      );
      db.prepare("insert into task_progress values (?, ?, 'passed', ?, 4000, 3000)").run(
        "bob",
        firstId,
        "first-hash",
      );

      const resultsFor = db.prepare(
        "select * from task_problem_results where task_id = ? order by user_id, problem_id",
      );
      const originals = resultsFor.all(from);
      const existing = resultsFor.get(firstId);
      const progressFor = db.prepare(
        "select * from task_progress where task_id = ? order by user_id",
      );
      const existingProgress = progressFor.get(firstId);
      // 結果を移し先に書いた直後に停止しても、旧課題の行から進捗を補える。
      expect(runCarryover(statements.slice(0, 1))).toEqual([2]);
      expect(resultsFor.all(from)).toEqual(originals);
      expect(progressFor.all(firstId)).toEqual([existingProgress]);

      expect(runCarryover()).toEqual([0, 1, 3, 1, 1, 1]);
      expect(resultsFor.all(from)).toEqual([originals[4], originals[5]]);
      expect(resultsFor.all(firstId)).toEqual([
        { ...originals[0], task_id: firstId, content_hash: "first-hash" },
        existing,
        { ...originals[2], task_id: firstId, content_hash: "first-hash" },
      ]);
      expect(resultsFor.all(secondId)).toEqual([
        { ...originals[3], task_id: secondId, content_hash: "second-hash" },
      ]);
      expect(progressFor.all(firstId)).toEqual([
        {
          user_id: "alice",
          task_id: firstId,
          content_hash: "first-hash",
          status: "local-passed",
          updated_at: expect.any(Number),
          passed_at: null,
        },
        existingProgress,
      ]);
      expect(progressFor.all(secondId)).toEqual([
        {
          user_id: "bob",
          task_id: secondId,
          content_hash: "second-hash",
          status: "local-passed",
          updated_at: expect.any(Number),
          passed_at: null,
        },
      ]);
      expect(runCarryover()).toEqual([0, 0, 0, 0, 0, 0]);

      // 管理者による手動完了の取り消しを模す。
      const revoke = db.prepare(
        "delete from task_problem_results where user_id = ? and task_id = ? and problem_id = ?",
      );
      expect(revoke.run("alice", firstId, "q01-01").changes).toBe(1);
      expect(runCarryover()).toEqual([0, 0, 0, 0, 0, 0]);
      expect(resultsFor.all(firstId)).toEqual([
        existing,
        { ...originals[2], task_id: firstId, content_hash: "first-hash" },
      ]);
    } finally {
      db.close();
    }
  });
});
