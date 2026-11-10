import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import { profiles, submissions, tenants } from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { learnerOnly, learnerOrUnknown } from "./learner-scope.js";

describe("learnerOnly (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  beforeEach(async () => {
    database = sqliteD1();
    const db = getDb({ DB: database.binding } as Env);
    await db.insert(tenants).values({ id: "ses", name: "テスト" });
    await db.insert(profiles).values([
      { id: "student", tenantId: "ses", displayName: "受講者", role: "student" },
      {
        id: "disabled-student",
        tenantId: "ses",
        displayName: "無効化済みの受講者",
        role: "student",
        disabled: true,
      },
      { id: "staff", tenantId: "ses", displayName: "講師", role: "admin" },
      { id: "admin", tenantId: "ses", displayName: "管理者", role: "admin" },
      { id: "platform-admin", tenantId: "ses", displayName: "運営", role: "platform_admin" },
    ]);
  });
  afterEach(() => database.sqlite.close());

  it.each(["column", "sql"])("%s: 無効化済みを含む student の行だけを返す", async (kind) => {
    const db = getDb({ DB: database.binding } as Env);
    const query = db
      .select({ id: profiles.id })
      .from(profiles)
      .where(learnerOnly(kind === "column" ? profiles.id : sql`${profiles.id}`))
      .orderBy(profiles.id);

    expect(query.toSQL().params).toEqual([]);
    expect(await query).toEqual([{ id: "disabled-student" }, { id: "student" }]);
  });

  it.each(["column", "sql"])("%s: null の提出を残し、講師・管理者の提出を除く", async (kind) => {
    const db = getDb({ DB: database.binding } as Env);
    await db.insert(submissions).values(
      [null, "student", "disabled-student", "staff", "admin", "platform-admin"].map(
        (studentId) => ({
          id: studentId ?? "unknown",
          studentId,
          code: "",
          stageTitle: "",
          assignmentTitle: "",
        }),
      ),
    );
    const query = db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        learnerOrUnknown(kind === "column" ? submissions.studentId : sql`${submissions.studentId}`),
      )
      .orderBy(submissions.id);
    expect(query.toSQL().params).toEqual([]);
    expect(await query).toEqual([{ id: "disabled-student" }, { id: "student" }, { id: "unknown" }]);
  });
});
