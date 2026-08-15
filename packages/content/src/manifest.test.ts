import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";

describe("buildContentManifest", () => {
  const { courses, quizzes } = buildContentManifest();
  const ts = courses.find((c) => c.id === "typescript-basics");
  if (!ts) throw new Error("typescript-basics course missing");
  const tsQuizzes = quizzes.filter((q) => q.courseId === "typescript-basics");

  it("courses/ 配下の講座を course.json から組み立てる", () => {
    expect(courses.map((c) => c.id)).toContain("typescript-basics");
    expect(ts.category).toBe("プログラミング");
    expect(ts.title).toBe("TypeScript 入門研修");
  });

  it("Section はモジュール 10 個", () => {
    expect(ts.sections).toHaveLength(10);
    expect(ts.sections?.[0].id).toBe("m0-orientation");
  });

  it("トピックが slides レッスンになり、本文と枚数を持つ", () => {
    const m1 = ts.sections?.find((s) => s.id === "m1-values");
    const lesson = m1?.lessons.find((l) => l.id === "1-1-2");
    expect(lesson?.type).toBe("slides");
    expect(lesson?.title).toBe("constとletの違い");
    expect(lesson?.pdfPath).toBeUndefined();
    expect(lesson?.markdown).toContain("constは再代入できない");
    expect(lesson?.totalPages).toBeGreaterThanOrEqual(4);
    expect(lesson?.totalPages).toBeLessThanOrEqual(6);
  });

  it("スライド本文から講師ノートが除かれている", () => {
    const m1 = ts.sections?.find((s) => s.id === "m1-values");
    const lesson = m1?.lessons.find((l) => l.id === "1-1-2");
    expect(lesson?.markdown).not.toContain("ノート:");
  });

  it("スライド本文の画像も R2 の絶対パスに書き換わる", () => {
    const slides = ts.sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    for (const l of slides ?? []) {
      expect(l.markdown ?? "").not.toMatch(/!\[[^\]]*\]\(assets\//);
    }
  });

  // 描画側 (apps/web の MarkdownSlides) は markdown を `\n---\n` で割り、空チャンクを捨てて
  // 総ページ数を決める。splitSlides は捨てないので、空スライドが 1 枚でもあれば画面の
  // 「n / 総数」と D1 の totalPages がずれる。これが落ちたら desync が現実になった合図。
  it("スライド本文に空ページが無く、分割数が totalPages と一致する", () => {
    const slides = ts.sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    expect(slides?.length).toBeGreaterThan(0);
    for (const l of slides ?? []) {
      const pages = (l.markdown ?? "").split(/\n---\n/);
      for (const [i, page] of pages.entries()) {
        expect(page.trim(), `空スライド: ${l.id} の ${i + 1} 枚目`).not.toBe("");
      }
      expect(pages.length, `枚数不一致: ${l.id}`).toBe(l.totalPages);
    }
  });

  it("レッスンごとに doc(text) と quiz が 1 つずつ付く", () => {
    const m1 = ts.sections?.find((s) => s.id === "m1-values");
    expect(m1?.lessons.filter((l) => l.type === "text").map((l) => l.id)).toContain("doc-1-1");
    expect(m1?.lessons.filter((l) => l.type === "quiz").map((l) => l.id)).toContain("quiz-1-1");
  });

  it("doc の markdown は画像を R2 の絶対 URL に書き換える", () => {
    const m1 = ts.sections?.find((s) => s.id === "m1-values");
    const doc = m1?.lessons.find((l) => l.id === "doc-1-1");
    expect(doc?.markdown).toContain(
      "tenant/ses/courses/typescript-basics/assets/t1-what-is-a-variable/variable-box.svg",
    );
    expect(doc?.markdown).not.toMatch(/\]\(t\d-/);
  });

  it("quiz レッスンごとに QuizSeed がある", () => {
    const quizLessonIds = ts.sections
      ?.flatMap((s) => s.lessons)
      .filter((l) => l.type === "quiz")
      .map((l) => l.id);
    expect(tsQuizzes.map((q) => q.lessonId).sort()).toEqual(quizLessonIds?.sort());
    expect(tsQuizzes.every((q) => q.courseId === "typescript-basics")).toBe(true);
  });

  it("全 162 トピックが載る", () => {
    const slides = ts.sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    expect(slides).toHaveLength(162);
  });

  // parseQuiz は「## 確認クイズ」節が無いと黙って [] を返す。見出しの改名で
  // レッスン 1 本ぶんの小テストが無言で消えるのを、ここで止める。
  it("全 42 レッスンに確認クイズがある", () => {
    expect(tsQuizzes).toHaveLength(42);
    for (const q of tsQuizzes) expect(q.questions.length).toBeGreaterThan(0);
  });

  it("manifest の本文に LMS で解決できない相対リンクが残っていない", () => {
    const all = ts.sections?.flatMap((s) => s.lessons) ?? [];
    for (const l of all) {
      const md = l.markdown ?? "";
      // 画像・非画像を問わず、http(s) でも R2 キーでもないリンク先が残っていたら漏れ
      const leaked = [...md.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
        .map((m) => m[1])
        .filter((href) => !/^https?:/.test(href) && !href.startsWith("tenant/"));
      expect(leaked).toEqual([]);
    }
  });
});

describe("buildContentManifest — 複数講座", () => {
  it("courses/ に並んだ講座をそれぞれ組み立てる", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-multi-"));
    try {
      for (const slug of ["alpha-basics", "beta-basics"]) {
        const topic = join(root, slug, "modules", "m0-x", "l1-y", "t1-z");
        mkdirSync(topic, { recursive: true });
        writeFileSync(
          join(root, slug, "course.json"),
          JSON.stringify({ title: `${slug} 講座`, category: "プログラミング", color: "indigo" }),
        );
        writeFileSync(
          join(topic, "slides.md"),
          '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n',
        );
        writeFileSync(join(root, slug, "modules", "m0-x", "l1-y", "doc.md"), "# ドキュメント\n");
        writeFileSync(
          join(root, slug, "modules", "m0-x", "l1-y", "practice.md"),
          [
            "# 演習",
            "",
            "## 確認クイズ",
            "",
            `### Q1. ${slug} の問`,
            "",
            "- A. 正",
            "- B. 誤",
            "",
            "<details>",
            "<summary>答え</summary>",
            "",
            "**A** — 講座ごとの設問",
            "",
            "</details>",
            "",
          ].join("\n"),
        );
      }
      const { courses, quizzes } = buildContentManifest(root);
      expect(courses.map((c) => c.id)).toEqual(["alpha-basics", "beta-basics"]);
      expect(courses.map((c) => c.title)).toEqual(["alpha-basics 講座", "beta-basics 講座"]);
      expect(quizzes.map((q) => q.courseId)).toEqual(["alpha-basics", "beta-basics"]);
      expect(quizzes.map((q) => q.lessonId)).toEqual(["quiz-0-1", "quiz-0-1"]);
      expect(quizzes.map((q) => q.questions[0]?.prompt)).toEqual([
        "alpha-basics の問",
        "beta-basics の問",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("buildContentManifest — コード演習の配線", () => {
  function writeCourse(root: string, exercises: unknown) {
    const topic = join(root, "demo-course", "modules", "m0-x", "l1-y", "t1-z");
    mkdirSync(topic, { recursive: true });
    writeFileSync(
      join(root, "demo-course", "course.json"),
      JSON.stringify({ title: "デモ講座", exercises }),
    );
    writeFileSync(
      join(topic, "slides.md"),
      '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n',
    );
    writeFileSync(
      join(root, "demo-course", "modules", "m0-x", "l1-y", "doc.md"),
      "# ドキュメント\n",
    );
    writeFileSync(join(root, "demo-course", "modules", "m0-x", "l1-y", "practice.md"), "# 演習\n");
  }

  it("exercises のレッスンキーから type:code のレッスンが生える", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-code-"));
    try {
      writeCourse(root, {
        "0-1": [{ id: "S0-Sql-Ch00-01-select-hello", title: "SQL: 数値を SELECT する" }],
      });
      const { courses } = buildContentManifest(root);
      const lessons = courses[0].sections?.[0].lessons ?? [];
      const code = lessons.find((l) => l.type === "code");
      // 並び位置ではなく assignment id 由来。演習の挿入・入れ替えで進捗がずれない。
      expect(code?.id).toBe("code-S0-Sql-Ch00-01-select-hello");
      expect(code?.title).toBe("SQL: 数値を SELECT する");
      expect(code?.assignmentId).toBe("S0-Sql-Ch00-01-select-hello");
      // 並びは スライド → まとめ → (クイズ) → コード演習
      expect(lessons[lessons.length - 1]).toBe(code);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("対応するレッスンが無いキーはビルドで落ちる", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-code-bad-"));
    try {
      writeCourse(root, { "9-9": [{ id: "X", title: "宙に浮いた演習" }] });
      expect(() => buildContentManifest(root)).toThrow(/9-9/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// CRLF でチェックアウトされたツリー（core.autocrlf=true・.gitattributes 無し）でも
// 同じ manifest になること。doc.md だけは他のパーサを通らないので、ここが唯一の番人。
describe("buildContentManifest — CRLF チェックアウト", () => {
  it("markdown に \\r が混ざらない", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-crlf-"));
    try {
      const courseDir = join(root, "demo-course");
      const topic = join(courseDir, "modules", "m0-x", "l1-y", "t1-z");
      mkdirSync(topic, { recursive: true });
      writeFileSync(
        join(courseDir, "course.json"),
        JSON.stringify({ title: "デモ講座", category: "プログラミング", color: "indigo" }),
      );
      const crlf = (s: string) => s.replace(/\n/g, "\r\n");
      writeFileSync(
        join(topic, "slides.md"),
        crlf('---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n'),
      );
      writeFileSync(
        join(courseDir, "modules", "m0-x", "l1-y", "doc.md"),
        crlf("# ドキュメント\n\n本文\n"),
      );
      writeFileSync(join(courseDir, "modules", "m0-x", "l1-y", "practice.md"), crlf("# 演習\n"));

      const { courses } = buildContentManifest(root);
      for (const l of courses[0].sections?.[0].lessons ?? []) {
        expect(l.markdown ?? "").not.toContain("\r");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
