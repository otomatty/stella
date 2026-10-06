import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import { codingRules } from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { renderRuleBlocks } from "./ai-review-prompt.js";
import { loadCodingRuleSet } from "./coding-rule-set.js";

type RuleRow = typeof codingRules.$inferInsert;

const rule = (id: string, scope: string, position: number): RuleRow => ({
  id,
  scope,
  position,
  title: `${id} の名前`,
  statement: `${id} の確かめられる文。`,
  appliesTo: "すべて",
  introducedIn: "dev-env-basics",
  contentHash: "f".repeat(64),
});

/** 第 2 キーを足す前の並び (scope の中の position だけ) で作った版。 */
function hashByPositionOnly(rows: RuleRow[]): string {
  const text = (scope: string) =>
    rows
      .filter((r) => r.scope === scope)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        id: r.id,
        title: r.title,
        statement: r.statement,
        appliesTo: r.appliesTo,
        introducedIn: r.introducedIn,
        exception: r.exception ?? null,
      }));
  const blocks = renderRuleBlocks({
    commonRules: text("common"),
    courseRules: text("dev-env-basics"),
    courseSlug: "dev-env-basics",
  });
  return createHash("sha256").update(`${blocks.common}\n\n${blocks.course}`).digest("hex");
}

describe("コーディング規則の版 (loadCodingRuleSet)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let db: ReturnType<typeof getDb>;
  beforeEach(() => {
    database = sqliteD1();
    db = getDb({ DB: database.binding } as unknown as Env);
  });
  afterEach(() => database.sqlite.close());

  it("seed の position が scope の中で一意なら、第 2 キー (id) を足しても版のハッシュは変わらない", async () => {
    // seed (`parseCodingRules`) は文書ごとに 0 始まりの連番を振る。id の順と position の順を
    // わざと逆にし、共通と講座で同じ position があっても、提出時に記録した版と同じになることを見る。
    const rows = [
      rule("CR-ZZZ-01", "common", 0),
      rule("CR-AAA-01", "common", 1),
      rule("DEV-ZZZ-01", "dev-env-basics", 0),
      rule("DEV-AAA-01", "dev-env-basics", 1),
      rule("JS-AAA-01", "javascript-basics", 0),
    ];
    await db.insert(codingRules).values([...rows].reverse());
    const set = await loadCodingRuleSet(db, "dev-env-basics");
    expect(set.commonRules.map((r) => r.id)).toEqual(["CR-ZZZ-01", "CR-AAA-01"]);
    expect(set.courseRules.map((r) => r.id)).toEqual(["DEV-ZZZ-01", "DEV-AAA-01"]);
    expect(set.hash).toBe(hashByPositionOnly(rows));
  });

  it("position が重なった行でも、読むたびに同じ並び (id 順) と版になる", async () => {
    const rows = [rule("CR-BBB-01", "common", 0), rule("CR-AAA-01", "common", 0)];
    await db.insert(codingRules).values(rows);
    const first = await loadCodingRuleSet(db, "dev-env-basics");
    await db.delete(codingRules);
    await db.insert(codingRules).values([...rows].reverse());
    const second = await loadCodingRuleSet(db, "dev-env-basics");
    expect(first.commonRules.map((r) => r.id)).toEqual(["CR-AAA-01", "CR-BBB-01"]);
    expect(second.hash).toBe(first.hash);
  });
});
