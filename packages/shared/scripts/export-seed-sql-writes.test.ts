import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { buildContentManifest } from "@stella/content";

import { splitSqlStatements } from "../../../apps/api/scripts/lib/d1-remote.js";

/**
 * seed を流し直したときに D1 へ書く行数。
 *
 * D1 は書き直した行を (内容が同じでも) 書き込み行数に数え、無料枠は 1 日 10 万行。
 * 2026-10-06 に、教材が変わるたびに全行を書き直す seed で本番のデプロイが止まった。
 * ここでは全 migration を当てた DB に seed を流し、
 *
 *   - 同じ seed をもう一度流すと 1 行も書かない
 *   - 教材を 1 か所変えると、その行だけを書く
 *
 * を確かめる。seed-d1 と同じ分割で 1 文ずつ流し、文ごとに total_changes() の差を取る
 * (D1 の rows_written も文ごと)。本番の deploy と同じく配布 PDF のマニフェストも渡し、
 * 検証用 fixture (profiles / enrollments / submissions) を含む local の seed で見る
 * (本番の CONTENT_ONLY はその部分集合)。
 */

type Manifest = ReturnType<typeof buildContentManifest>;

const fixture = vi.hoisted(() => ({ mutate: null as ((manifest: Manifest) => void) | null }));

vi.mock("@stella/content", async (importOriginal) => {
  const real = await importOriginal<typeof import("@stella/content")>();
  return {
    ...real,
    buildContentManifest: (...args: Parameters<typeof real.buildContentManifest>) => {
      const manifest = real.buildContentManifest(...args);
      fixture.mutate?.(manifest);
      return manifest;
    },
  };
});

function stableUuid(key: string): string {
  const bytes = Uint8Array.from(createHash("sha1").update(key).digest().subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const COURSE = "dev-env-basics";
const LESSON = "0-1-1";
const QUIZ_LESSON = "quiz-0-1";

const pdfDir = mkdtempSync(join(tmpdir(), "stella-seed-writes-"));
const pdfManifest = join(pdfDir, "pdf-manifest.json");
const pdfEntry = (lessonId: string, os?: "windows" | "macos") => ({
  tenantId: "ses",
  courseSlug: COURSE,
  lessonId,
  ...(os ? { os } : {}),
  hash: `hash-${lessonId}-${os ?? "both"}`,
  key: `lesson-pdf/ses/${COURSE}/${lessonId}/hash-${lessonId}-${os ?? "both"}.pdf`,
  fileName: `${lessonId}${os ? ` (${os})` : ""}.pdf`,
  sizeBytes: 10,
});
writeFileSync(
  pdfManifest,
  JSON.stringify([pdfEntry("doc-0-1"), pdfEntry(LESSON, "windows"), pdfEntry(LESSON, "macos")]),
);

afterAll(() => {
  rmSync(pdfDir, { recursive: true, force: true });
});

/** seed の SQL を同じプロセスで組み立てる。`mutate` で教材 (manifest) を書き換えられる。 */
async function exportSql(mutate?: (manifest: Manifest) => void): Promise<string> {
  fixture.mutate = mutate ?? null;
  vi.stubEnv("DIALECT", "sqlite");
  vi.stubEnv("CONTENT_ONLY", "0");
  vi.stubEnv("PDF_MANIFEST", pdfManifest);
  const logs: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((s) => {
    logs.push(String(s));
  });
  try {
    vi.resetModules();
    await import("./export-seed-sql.js");
  } finally {
    spy.mockRestore();
    vi.unstubAllEnvs();
    fixture.mutate = null;
  }
  return logs.join("\n");
}

function migratedDb(): DatabaseSync {
  const migrations = fileURLToPath(new URL("../../../apps/api/drizzle", import.meta.url));
  const db = new DatabaseSync(":memory:");
  db.exec("pragma foreign_keys = off");
  for (const name of readdirSync(migrations)
    .filter((n) => n.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(join(migrations, name), "utf8"));
  db.exec("pragma foreign_keys = on");
  return db;
}

/** 書いた文を `表:id` (insert) か文の頭 (update / delete) で表す。 */
function describeStatement(statement: string): string {
  const insert = /^insert into (\w+) \([^)]*\) (?:values \(|select )'([^']*)'/.exec(statement);
  return insert ? `${insert[1]}:${insert[2]}` : statement.slice(0, 160);
}

/** seed-d1 と同じ分割で 1 文ずつ流し、行を書いた文と行数を返す。 */
function apply(db: DatabaseSync, sql: string): Record<string, number> {
  const totalChanges = () =>
    Number((db.prepare("select total_changes() as n").get() as { n: number }).n);
  const writes: Record<string, number> = {};
  for (const statement of splitSqlStatements(sql)) {
    const before = totalChanges();
    db.exec(statement);
    const rows = totalChanges() - before;
    if (rows > 0) {
      const key = describeStatement(statement);
      writes[key] = (writes[key] ?? 0) + rows;
    }
  }
  return writes;
}

/** 1 回の apply は全教材の seed (約 1 万文) を 1 文ずつ流すので 1〜2 秒かかる。負荷の高い CI でも落ちない上限。 */
const SEED_TIMEOUT = 60_000;

const total = (writes: Record<string, number>) =>
  Object.values(writes).reduce((sum, rows) => sum + rows, 0);

describe("seed の書き込み行数", () => {
  let sql = "";
  let changed = "";
  const lessonId = stableUuid(`lesson:ses:${COURSE}:${LESSON}`);
  const optionId = stableUuid(`quiz-o:ses:${COURSE}:${QUIZ_LESSON}:0:0`);

  beforeAll(async () => {
    sql = await exportSql();
    // 教材を 2 か所だけ変える: スライドのレッスンの題名と、確認クイズの選択肢 1 つの文面。
    changed = await exportSql((manifest) => {
      const course = manifest.courses.find((c) => c.id === COURSE);
      const lesson = course?.sections?.flatMap((s) => s.lessons).find((l) => l.id === LESSON);
      const option = manifest.quizzes.find(
        (q) => q.courseId === COURSE && q.lessonId === QUIZ_LESSON,
      )?.questions[0]?.options[0];
      if (!lesson || !option) throw new Error("変える教材が見つかりません");
      lesson.title = `${lesson.title} (改)`;
      option.label = `${option.label} (改)`;
    });
    // fixtures / problems を丸ごと in-process で読み込むので既定の 5s では足りない。
  }, 120_000);

  it(
    "同じ seed を 2 回流すと、2 回目は 1 行も書かない",
    () => {
      const db = migratedDb();
      try {
        expect(total(apply(db, sql))).toBeGreaterThan(5000);
        expect(apply(db, sql)).toEqual({});
      } finally {
        db.close();
      }
    },
    SEED_TIMEOUT,
  );

  it(
    "教材を変えたら、変わった行だけを書く (戻したときも同じ)",
    () => {
      const db = migratedDb();
      try {
        apply(db, sql);
        const otherLessonId = stableUuid(`lesson:ses:${COURSE}:doc-0-1`);
        db.prepare("update lessons set updated_at = 0 where id in (?, ?)").run(
          lessonId,
          otherLessonId,
        );
        const lesson = (id: string) =>
          db.prepare("select title, updated_at from lessons where id = ?").get(id) as {
            title: string;
            updated_at: number;
          };
        const expected = { [`lessons:${lessonId}`]: 1, [`quiz_options:${optionId}`]: 1 };
        expect(apply(db, changed)).toEqual(expected);
        expect(lesson(lessonId).title).toMatch(/ \(改\)$/);
        // updated_at は比べない列。内容が変わった行でだけ一緒に進む。
        expect(lesson(lessonId).updated_at).toBeGreaterThan(0);
        expect(lesson(otherLessonId).updated_at).toBe(0);
        expect(apply(db, changed)).toEqual({});
        expect(apply(db, sql)).toEqual(expected);
        expect(apply(db, sql)).toEqual({});
      } finally {
        db.close();
      }
    },
    SEED_TIMEOUT,
  );

  it(
    "面談の質問は、人が直した行を上書きせず、解除を予約した行だけを内容が同じでも書き戻す",
    () => {
      const db = migratedDb();
      try {
        apply(db, sql);
        const { id } = db
          .prepare("select id from interview_questions order by no limit 1")
          .get() as {
          id: string;
        };
        const row = () =>
          db
            .prepare(
              "select question, edited_at, release_requested_at from interview_questions where id = ?",
            )
            .get(id) as {
            question: string;
            edited_at: number | null;
            release_requested_at: number | null;
          };
        const original = row().question;
        db.prepare(
          "update interview_questions set question = '手で直した', edited_at = 1 where id = ?",
        ).run(id);
        expect(apply(db, sql)).toEqual({});
        expect(row().question).toBe("手で直した");
        db.prepare("update interview_questions set release_requested_at = 2 where id = ?").run(id);
        expect(apply(db, sql)).toEqual({ [`interview_questions:${id}`]: 1 });
        expect(row()).toEqual({ question: original, edited_at: null, release_requested_at: null });
        // 本文は正本のまま、印だけ残っている行も印を落とす。
        db.prepare(
          "update interview_questions set edited_at = 3, release_requested_at = 4 where id = ?",
        ).run(id);
        expect(apply(db, sql)).toEqual({ [`interview_questions:${id}`]: 1 });
        expect(apply(db, sql)).toEqual({});
      } finally {
        db.close();
      }
    },
    SEED_TIMEOUT,
  );

  it(
    "教材から外れた課題だけを止め、残っている課題は書き直さない",
    () => {
      const db = migratedDb();
      try {
        apply(db, sql);
        const taskId = `${COURSE}/m0-first-page/q01-first-page`;
        db.prepare(
          `insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle, active)
         select 'retired-task', section_id, title, kind, pattern, skills, estimated_minutes, "order" + 1, content_hash, definition, bundle, 1 from tasks where id = ?`,
        ).run(taskId);
        const writes = apply(db, sql);
        expect(total(writes)).toBe(1);
        expect(Object.keys(writes)[0]).toMatch(/^update tasks set active = 0 /);
        expect(db.prepare("select id, active from tasks order by id").all()).toEqual([
          { id: taskId, active: 1 },
          { id: "retired-task", active: 0 },
        ]);
        expect(apply(db, sql)).toEqual({});
      } finally {
        db.close();
      }
    },
    SEED_TIMEOUT,
  );
});
