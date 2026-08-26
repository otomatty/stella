/**
 * 教材本文のリビジョン記録 — 「lessons 行の現在値を検証しながら、変わったときだけ
 * 連番で積む」guarded insert の検証。
 *
 * 実装は 1 文の insert ... select なので、resource-lock.test.ts と同じ流儀で
 * 「実 SQLite での WHERE の挙動」をモック側に再現して確かめる。文の要点
 * (l.markdown IS ? / 直前リビジョンとの IS NOT 比較) が変わったら
 * ここの再現も合わせて見直すこと。
 */

import { describe, expect, it } from "vitest";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import type { Db } from "../db/client.js";
import { recordLessonRevision, sha256Hex } from "./lesson-revision.js";

const dialect = new SQLiteSyncDialect();

interface RevisionRow {
  lessonId: string;
  revision: number;
  sourceHash: string;
  markdown: string | null;
  source: string;
  createdBy: string | null;
}

/** lessons 1 行と lesson_revisions を持つ最小の D1 代役。 */
function createDb(initialMarkdown: string | null = null) {
  const db = {
    /** lessons.markdown の現在値 (undefined = レッスン行なし)。 */
    lessonMarkdown: initialMarkdown as string | null | undefined,
    rows: [] as RevisionRow[],
    run: async (query: SQL) => {
      const built = dialect.sqlToQuery(query);
      // 文の形が変わったら (要点が消えたら) このモックごと見直す。
      expect(built.sql).toContain("insert into lesson_revisions");
      expect(built.sql).toContain("is not l.markdown");
      const [sourceHash, source, createdBy, , lessonId, markdown] = built.params as [
        string,
        string,
        string | null,
        number,
        string,
        string | null,
      ];
      // ここから実 SQLite の WHERE の再現:
      // where l.id = ? — レッスン行が無ければ何もしない
      if (db.lessonMarkdown === undefined) return { meta: { changes: 0 } };
      // and l.markdown is ? — 他の書き手が先に上書きしていたら積まない (null 安全)
      if (db.lessonMarkdown !== markdown) return { meta: { changes: 0 } };
      // and (直前リビジョンの markdown) is not l.markdown — 変わったときだけ
      const latest = db.rows.toSorted((a, b) => b.revision - a.revision)[0];
      const latestMarkdown = latest ? latest.markdown : null; // 履歴なしは NULL
      if (latestMarkdown === db.lessonMarkdown) return { meta: { changes: 0 } };
      db.rows.push({
        lessonId,
        revision: (latest?.revision ?? 0) + 1,
        sourceHash,
        markdown: db.lessonMarkdown,
        source,
        createdBy,
      });
      return { meta: { changes: 1 } };
    },
  };
  return db;
}

const asDb = (db: unknown) => db as unknown as Db;

/** lessons を書いてからリビジョンを記録する (cms.ts の save と同じ並び)。 */
async function saveAndRecord(db: ReturnType<typeof createDb>, markdown: string | null) {
  db.lessonMarkdown = markdown;
  await recordLessonRevision(asDb(db), {
    lessonId: "lesson-1",
    markdown,
    source: "cms",
    createdBy: "staff-1",
  });
}

describe("recordLessonRevision", () => {
  it("初回は revision 1 を積む", async () => {
    const db = createDb();
    await saveAndRecord(db, "# v1");
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({
      lessonId: "lesson-1",
      revision: 1,
      markdown: "# v1",
      source: "cms",
      createdBy: "staff-1",
      sourceHash: await sha256Hex("# v1"),
    });
  });

  it("直前リビジョンと同一内容なら積まない", async () => {
    const db = createDb();
    await saveAndRecord(db, "# v1");
    await saveAndRecord(db, "# v1");
    expect(db.rows).toHaveLength(1);
  });

  it("本文が変わるたびに連番が増える (A→B→A の戻しも新リビジョン)", async () => {
    const db = createDb();
    await saveAndRecord(db, "# A");
    await saveAndRecord(db, "# B");
    await saveAndRecord(db, "# A");
    expect(db.rows.map((r) => r.revision)).toEqual([1, 2, 3]);
  });

  it("番兵バックフィル (migration 0031) が最新でも本文比較で判定する", async () => {
    const db = createDb("# 導入前の本文");
    db.rows.push({
      lessonId: "lesson-1",
      revision: 1,
      sourceHash: "pre-versioning",
      markdown: "# 導入前の本文",
      source: "seed",
      createdBy: null,
    });
    await saveAndRecord(db, "# 導入前の本文");
    expect(db.rows).toHaveLength(1);
    await saveAndRecord(db, "# 編集後");
    expect(db.rows).toHaveLength(2);
    expect(db.rows[1]).toMatchObject({ revision: 2, markdown: "# 編集後" });
  });

  it("本文を null にする保存は、履歴があるレッスンでだけ記録する", async () => {
    const db = createDb();
    await saveAndRecord(db, null);
    expect(db.rows).toHaveLength(0);
    await saveAndRecord(db, "# v1");
    await saveAndRecord(db, null);
    expect(db.rows).toHaveLength(2);
    expect(db.rows[1]).toMatchObject({ revision: 2, markdown: null });
    await saveAndRecord(db, null);
    expect(db.rows).toHaveLength(2);
  });

  it("他の書き手 (seed) が lessons を先に上書きしていたら積まない", async () => {
    const db = createDb();
    // CMS が B を書いた後、記録の前に seed が A で上書きした状況。
    db.lessonMarkdown = "# seed の A";
    await recordLessonRevision(asDb(db), {
      lessonId: "lesson-1",
      markdown: "# CMS の B",
      source: "cms",
      createdBy: "staff-1",
    });
    // B の記録は seed 側 (lessons を最後に書いた側) に任せて、何も積まない。
    expect(db.rows).toHaveLength(0);
  });

  it("レッスン行が無ければ何もしない", async () => {
    const db = createDb();
    db.lessonMarkdown = undefined;
    await recordLessonRevision(asDb(db), {
      lessonId: "lesson-1",
      markdown: "# v1",
      source: "cms",
      createdBy: "staff-1",
    });
    expect(db.rows).toHaveLength(0);
  });
});
