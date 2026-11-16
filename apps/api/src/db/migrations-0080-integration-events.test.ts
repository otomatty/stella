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
  taskProblemResults,
  integrationClients,
  integrationGroups,
  integrationGroupMembers,
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
        await db
          .insert(integrationGroups)
          .values({ id: "group", clientId: "client", key: "sample", name: "fixture" });
        await db
          .insert(integrationGroupMembers)
          .values({ groupId: "group", profileId: "fixture-user" });
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
        await db.insert(taskProblemResults).values({
          userId,
          taskId: "fixture-task",
          problemId: "q1",
          contentHash: "current",
          source: "manual",
          manualReason: "PRIVATE REASON",
          path: "private.ts",
          code: "PRIVATE CODE",
          sha256: "hash",
          firstPassedAt: new Date(2000),
          updatedAt: new Date(2000),
        });
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
      fixture.sqlite.exec("delete from profiles where id='fixture-user'");
      expect(fixture.sqlite.prepare("select count(*) n from integration_events").get()?.n).toBe(0);
      expect(fixture.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    } finally {
      fixture.sqlite.close();
    }
  },
);
