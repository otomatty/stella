import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import type { Env } from "../env.js";
import { getDb } from "./client.js";
import {
  profiles,
  stages,
  sections,
  tasks,
  enrollments,
  submissions,
  integrationClients,
} from "./schema.js";

it.each([true, false])(
  "0080 はグループの人だけ過去分を移し、個人の削除時に消す (グループあり: %s)",
  async (hasGroup) => {
    const fixture = sqliteD1({ beforeMigration: "0080_integration_events" });
    try {
      fixture.sqlite.exec(
        "INSERT INTO tenants(id,name,active_count,active,created_at,updated_at) VALUES ('ses','fixture',0,1,1,1)",
      );
      const db = getDb({ DB: fixture.binding } as Env);
      await db.insert(profiles).values(
        ["fixture-user", "outside"].map((id) => ({
          id,
          email: `${id}@example.test`,
          displayName: id,
        })),
      );
      if (hasGroup) {
        await db.insert(integrationClients).values({
          id: "client",
          name: "fixture",
          tokenHash: "fixture-hash",
          tokenPrefix: "fixture",
        });
        fixture.sqlite.exec(`
          INSERT INTO integration_groups (id, client_id, external_key, name, created_at, updated_at)
          VALUES ('group', 'client', 'sample', 'fixture', 1, 1);
          INSERT INTO integration_group_members (group_id, profile_id, joined_at)
          VALUES ('group', 'fixture-user', 1);
        `);
      }
      await db
        .insert(stages)
        .values({ id: "fixture-stage", slug: "fixture-stage", title: "fixture" });
      await db
        .insert(sections)
        .values({ id: "fixture-unit", stageId: "fixture-stage", title: "fixture", order: 1 });
      await db.insert(tasks).values({
        id: "fixture-task",
        sectionId: "fixture-unit",
        title: "fixture",
        kind: "practice",
        pattern: "implementation",
        estimatedMinutes: 1,
        order: 1,
        contentHash: "current",
        definition: "{}",
        bundle: "{}",
      });
      for (const userId of ["fixture-user", "outside"]) {
        await db.insert(enrollments).values({
          userId,
          stageId: "fixture-stage",
          enrolledAt: new Date(1000),
          completedAt: new Date(4000),
        });
        await db.insert(submissions).values({
          studentId: userId,
          taskId: "fixture-task",
          stageTitle: "fixture",
          assignmentTitle: "fixture",
          code: "PRIVATE CODE",
          reviewNotes: "PRIVATE REVIEW",
          verdict: "pass",
          reviewSource: "human",
          reviewedAt: new Date(3000),
        });
        // 0080 適用前の列だけで、当時の問題結果を作る。
        fixture.sqlite
          .prepare(`
          insert into task_problem_results
            (user_id, task_id, problem_id, content_hash, source, manual_reason, path, code, sha256, first_passed_at, updated_at)
          values (?, 'fixture-task', 'q1', 'current', 'manual', 'PRIVATE REASON', 'private.ts', 'PRIVATE CODE', 'hash', 2000, 2000)
        `)
          .run(userId);
        await db.insert(submissions).values({
          studentId: userId,
          taskId: "fixture-task",
          stageTitle: "fixture",
          assignmentTitle: "fixture",
          code: "PRIVATE RETURNED",
          verdict: "resubmit",
          reviewSource: "human",
          reviewedAt: new Date(5000),
        });
      }
      fixture.sqlite.exec(
        readFileSync(new URL("../../drizzle/0080_integration_events.sql", import.meta.url), "utf8"),
      );
      expect(
        fixture.sqlite
          .prepare("select type,occurred_at,source from integration_events order by occurred_at")
          .all(),
      ).toEqual(
        hasGroup
          ? [
              { type: "stage_started", occurred_at: 1000, source: null },
              { type: "problem_passed", occurred_at: 2000, source: "manual" },
              { type: "task_passed", occurred_at: 3000, source: "human" },
              { type: "stage_cleared", occurred_at: 4000, source: null },
              { type: "task_returned", occurred_at: 5000, source: "human" },
            ]
          : [],
      );
      expect(
        fixture.sqlite
          .prepare("select count(*) n from integration_events where user_id='outside'")
          .get()?.n,
      ).toBe(0);
      expect(
        JSON.stringify(fixture.sqlite.prepare("select * from integration_events").all()),
      ).not.toContain("PRIVATE");
      const deletedAfter = Date.now();
      for (const userId of ["fixture-user", "outside"]) {
        fixture.sqlite
          .prepare(
            "update submissions set verdict='fail',reviewed_at=6000 where student_id=? and verdict='pass'",
          )
          .run(userId);
        fixture.sqlite.prepare("delete from task_problem_results where user_id=?").run(userId);
        await db.insert(submissions).values({
          id: `delete-${userId}`,
          studentId: userId,
          taskId: "fixture-task",
          stageTitle: "fixture",
          assignmentTitle: "fixture",
          code: "PRIVATE",
          verdict: "pass",
          reviewSource: "manual",
          attempt: 2,
          reviewedAt: new Date(7000),
        });
        fixture.sqlite.prepare("delete from submissions where id=?").run(`delete-${userId}`);
      }
      const revocations = fixture.sqlite
        .prepare(
          "select type,reason,submission_attempt,occurred_at from integration_events where type in ('task_pass_revoked','problem_pass_revoked') order by seq",
        )
        .all();
      expect(
        revocations.map((row) => ({
          type: row.type,
          reason: row.reason,
          attempt: row.submission_attempt,
        })),
      ).toEqual(
        hasGroup
          ? [
              { type: "task_pass_revoked", reason: "fail", attempt: 1 },
              { type: "problem_pass_revoked", reason: null, attempt: 1 },
              { type: "task_pass_revoked", reason: "removed", attempt: 2 },
            ]
          : [],
      );
      if (hasGroup) {
        expect(revocations[0]?.occurred_at).toBe(6000);
        for (const row of revocations.slice(1)) {
          expect(Number.isSafeInteger(row.occurred_at)).toBe(true);
          expect(Number(row.occurred_at)).toBeGreaterThanOrEqual(deletedAfter);
          expect(Number(row.occurred_at)).toBeLessThanOrEqual(Date.now());
        }
      }
      expect(
        fixture.sqlite
          .prepare("select count(*) n from integration_events where user_id='outside'")
          .get()?.n,
      ).toBe(0);
      const stageChangesAfter = Date.now();
      for (const userId of ["fixture-user", "outside"]) {
        fixture.sqlite
          .prepare("update enrollments set status='active',completed_at=null where user_id=?")
          .run(userId);
        fixture.sqlite.prepare("delete from enrollments where user_id=?").run(userId);
      }
      const stageChanges = fixture.sqlite
        .prepare(
          "select type,occurred_at from integration_events where type in ('stage_clear_revoked','stage_unassigned') order by seq",
        )
        .all();
      expect(stageChanges.map((row) => row.type)).toEqual(
        hasGroup ? ["stage_clear_revoked", "stage_unassigned"] : [],
      );
      for (const row of stageChanges) {
        expect(Number.isSafeInteger(row.occurred_at)).toBe(true);
        expect(Number(row.occurred_at)).toBeGreaterThanOrEqual(stageChangesAfter);
        expect(Number(row.occurred_at)).toBeLessThanOrEqual(Date.now());
      }
      expect(
        fixture.sqlite
          .prepare("select count(*) n from integration_events where user_id='outside'")
          .get()?.n,
      ).toBe(0);
      const sequences = fixture.sqlite
        .prepare("select seq from integration_events order by seq")
        .all()
        .map((r) => Number(r.seq));
      expect(
        sequences.every(
          (seq, index) => seq > 0 && (index === 0 || seq > Number(sequences[index - 1])),
        ),
      ).toBe(true);
      if (hasGroup) {
        expect(() =>
          fixture.sqlite.exec(
            "insert into integration_events(id,type,occurred_at,user_id,stage_id) select id,type,occurred_at,user_id,stage_id from integration_events limit 1",
          ),
        ).toThrow();
      }
      fixture.sqlite.exec("delete from profiles where id='fixture-user'");
      expect(fixture.sqlite.prepare("select count(*) n from integration_events").get()?.n).toBe(0);
      if (hasGroup) {
        await db
          .insert(profiles)
          .values({ id: "next-user", email: "next@example.test", displayName: "fixture" });
        fixture.sqlite.exec(
          "INSERT INTO integration_group_members (group_id, profile_id, joined_at) VALUES ('group', 'next-user', 1)",
        );
        await db
          .insert(enrollments)
          .values({ userId: "next-user", stageId: "fixture-stage", enrolledAt: new Date(1000) });
        expect(
          Number(fixture.sqlite.prepare("select seq from integration_events").get()?.seq),
        ).toBeGreaterThan(Math.max(...sequences));
      }
      expect(fixture.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    } finally {
      fixture.sqlite.close();
    }
  },
);
