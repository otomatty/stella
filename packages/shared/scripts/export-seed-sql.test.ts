import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

function stableUuid(key: string): string {
  const h = createHash("sha1").update(key).digest();
  const bytes = Uint8Array.from(h.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

describe("export-seed-sql (sqlite)", () => {
  const sql = execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, DIALECT: "sqlite" },
  });

  it("教材コースを upsert する", () => {
    expect(sql).toContain("'typescript-basics'");
  });

  it("スライドレッスンに本文 markdown が入る", () => {
    expect(sql).toMatch(/insert into lessons \([^)]*\)\s*select[\s\S]*?'slides'[\s\S]*?constは再代入できない/);
  });

  it("図解画像は R2 の絶対パスで入る", () => {
    expect(sql).toContain("tenant/ses/courses/typescript-basics/assets/");
  });

  it("quiz / quiz_questions / quiz_options を emit する", () => {
    expect(sql).toMatch(/insert into quizzes /);
    expect(sql).toMatch(/insert into quiz_questions /);
    expect(sql).toMatch(/insert into quiz_options /);
  });

  it("sections を course_id だけで丸ごと wipe しない", () => {
    expect(sql).not.toMatch(/delete from\s+(public\.)?sections where course_id = '[^']+';/i);
  });

  it("教材から消えた lesson / section を prune する", () => {
    expect(sql).toMatch(
      /delete from lessons where section_id in \(select id from sections where course_id = '[^']+'\) and id not in \(/i,
    );
    expect(sql).toMatch(/delete from sections where course_id = '[^']+' and id not in \(/i);
    expect(sql).toMatch(/delete from lesson_progress where lesson_id not in \(select id from lessons\)/i);
  });

  it("sections は slug で既存コースに紐づけて upsert する", () => {
    expect(sql).toMatch(
      /insert into sections \([^)]*\)\s*select[\s\S]*?\bfrom courses\b[\s\S]*?on conflict \(id\) do update/i,
    );
    expect(sql).toMatch(
      /insert into sections \([^)]*\)\s*select[\s\S]*?c\.id = '[0-9a-f-]{36}'[\s\S]*?on conflict \(id\) do update/i,
    );
  });

  it("lessons は upsert し markdown を更新する", () => {
    expect(sql).toMatch(
      /insert into lessons \([^)]*\)\s*select[\s\S]*?on conflict \(id\) do update set[\s\S]*?markdown = excluded\.markdown/i,
    );
  });

  it("レッスン UUID は section に依存せず、移動時は section_id を更新する", () => {
    const withoutSection = stableUuid("lesson:ses:typescript-basics:1-1-2");
    const withSection = stableUuid("lesson:ses:typescript-basics:m1-values:1-1-2");
    expect(sql).toContain(`'${withoutSection}'`);
    expect(sql).not.toMatch(new RegExp(`select '${withSection}'`));
    expect(sql).toMatch(
      /on conflict \(id\) do update set section_id = excluded\.section_id/i,
    );
  });

  it("旧レッスン UUID からの進捗付け替えと quiz.lesson_id 更新を出す", () => {
    expect(sql).toMatch(
      /update lesson_progress set lesson_id = case lesson_id/i,
    );
    expect(sql).toMatch(/update quizzes set lesson_id = case lesson_id/i);
    expect(sql).toMatch(
      /on conflict \(id\) do update set lesson_id = excluded\.lesson_id, pass_score = excluded\.pass_score/i,
    );
  });

  it("設問ごとに正解がちょうど 1 つ（単一選択）", () => {
    // 選択肢ラベルには `const price: number = 300;` のようにセミコロンを含むコードが
    // 入るので、1 文 = 1 行であることを使って行単位で読む。
    const correctByQuestion = new Map<string, number>();
    for (const [, id] of sql.matchAll(/^insert into quiz_questions .*select '([^']+)'/gm)) {
      correctByQuestion.set(id, 0);
    }
    expect(correctByQuestion.size).toBeGreaterThan(0);

    for (const [, questionId, isCorrect] of sql.matchAll(
      /^insert into quiz_options .*select '[^']+', '([^']+)'.*, ([01]), \d+ where exists/gm,
    )) {
      if (isCorrect === "1") {
        correctByQuestion.set(questionId, (correctByQuestion.get(questionId) ?? 0) + 1);
      }
    }

    const notSingle = [...correctByQuestion].filter(([, n]) => n !== 1);
    expect(notSingle).toEqual([]);
  });

  it("既定では検証用 seed ユーザーを含む", () => {
    expect(sql).toContain("seed-admin");
    expect(sql).toContain("seed-submission-pending-1");
  });
});

describe("export-seed-sql (sqlite, CONTENT_ONLY)", () => {
  const sql = execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, DIALECT: "sqlite", CONTENT_ONLY: "1" },
  });

  it("検証用 fixture を出さない", () => {
    expect(sql).not.toContain("seed-admin");
    expect(sql).not.toContain("seed-learner");
    expect(sql).not.toContain("seed-submission-pending-1");
    expect(sql).not.toContain("seed-enrollment-");
  });

  it("教材コースは残す", () => {
    expect(sql).toContain("'typescript-basics'");
    expect(sql).toMatch(/insert into lessons /);
  });
});

// quizUuid は course / section を含まないため、fixtures 側に教材の quiz と同じ lesson.id が
// 現れると同じ quiz 行が二度 emit され、後勝ちで fixtures のレッスンを指してしまう。
// 教材コースにスコープするガードが消えたら落ちるよう、@falcon/content を差し替えて
// 「fixtures の実在レッスンと同じ lesson.id を持つ教材コース」という衝突を作って検証する。
vi.mock("@falcon/content", async () => {
  const { SES_COURSES } = await import("../../../apps/web/src/data/fixtures.js");
  const collidingLessonId = SES_COURSES[0].sections[0].lessons[0].id;

  return {
    buildContentManifest: () => ({
      courses: [
        {
          id: "typescript-basics",
          title: "教材コース（テスト用）",
          sections: [
            {
              id: "s1",
              title: "セクション 1",
              lessons: [{ id: collidingLessonId, title: "確認クイズ", type: "quiz" }],
            },
          ],
        },
      ],
      quizzes: [
        {
          lessonId: collidingLessonId,
          passScore: 80,
          questions: [
            { prompt: "問", explanation: "解説", options: [{ label: "正", isCorrect: true }] },
          ],
        },
      ],
    }),
  };
});

describe("quiz の紐付けは教材コースに限定される", () => {
  it("同じ lesson.id を持つ fixtures レッスンには quiz を emit しない", async () => {
    process.env.DIALECT = "sqlite";
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((s) => {
      logs.push(String(s));
    });
    await import("./export-seed-sql.js");
    spy.mockRestore();

    // 教材コース側の 1 件だけ。ガードが無ければ fixtures 側でも emit されて 2 件になる。
    expect(logs.join("\n").match(/^insert into quizzes /gm) ?? []).toHaveLength(1);
    // fixtures / problems を丸ごと in-process で読み込むので既定の 5s では足りない。
  }, 60_000);
});
