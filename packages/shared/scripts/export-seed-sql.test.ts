import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

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
    expect(sql).toMatch(/insert into lessons [^;]*'slides'[^;]*constは再代入できない/);
  });

  it("図解画像は R2 の絶対パスで入る", () => {
    expect(sql).toContain("tenant/ses/courses/typescript-basics/assets/");
  });

  it("quiz / quiz_questions / quiz_options を emit する", () => {
    expect(sql).toMatch(/insert into quizzes /);
    expect(sql).toMatch(/insert into quiz_questions /);
    expect(sql).toMatch(/insert into quiz_options /);
  });

  it("設問ごとに正解がちょうど 1 つ（単一選択）", () => {
    // 選択肢ラベルには `const price: number = 300;` のようにセミコロンを含むコードが
    // 入るので、1 文 = 1 行であることを使って行単位で読む。
    const correctByQuestion = new Map<string, number>();
    for (const [, id] of sql.matchAll(/^insert into quiz_questions .*values \('([^']+)'/gm)) {
      correctByQuestion.set(id, 0);
    }
    expect(correctByQuestion.size).toBeGreaterThan(0);

    for (const [, questionId, isCorrect] of sql.matchAll(
      /^insert into quiz_options .*values \('[^']+', '([^']+)'.*, ([01]), \d+\);$/gm,
    )) {
      if (isCorrect === "1") {
        correctByQuestion.set(questionId, (correctByQuestion.get(questionId) ?? 0) + 1);
      }
    }

    const notSingle = [...correctByQuestion].filter(([, n]) => n !== 1);
    expect(notSingle).toEqual([]);
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
