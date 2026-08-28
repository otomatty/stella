import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildContentManifest, collectCourseThumbnails } from "./manifest.js";

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

describe("buildContentManifest — 確認クイズの所要時間", () => {
  function buildWithQuestions(count: number) {
    const root = mkdtempSync(join(tmpdir(), "manifest-quiz-duration-"));
    try {
      const lessonDir = join(root, "gamma-basics", "modules", "m0-x", "l1-y");
      mkdirSync(join(lessonDir, "t1-z"), { recursive: true });
      writeFileSync(
        join(root, "gamma-basics", "course.json"),
        JSON.stringify({ title: "gamma 講座" }),
      );
      writeFileSync(
        join(lessonDir, "t1-z", "slides.md"),
        '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n',
      );
      writeFileSync(join(lessonDir, "doc.md"), "# ドキュメント\n");
      const questions = Array.from({ length: count }, (_, i) =>
        [
          `### Q${i + 1}. 設問${i + 1}`,
          "",
          "- A. 正",
          "- B. 誤",
          "",
          "<details>",
          "<summary>答え</summary>",
          "",
          "**A** — 解説",
          "",
          "</details>",
          "",
        ].join("\n"),
      );
      writeFileSync(
        join(lessonDir, "practice.md"),
        ["# 演習", "", "## 確認クイズ", "", ...questions].join("\n"),
      );
      const { courses } = buildContentManifest(root);
      const quiz = courses[0]?.sections?.[0]?.lessons.find((l) => l.type === "quiz");
      return quiz?.duration;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("レッスン末尾の短いクイズは 5分 のまま", () => {
    expect(buildWithQuestions(5)).toBe("5分");
    expect(buildWithQuestions(10)).toBe("5分");
  });

  it("模擬試験のような長いクイズは実時間で出す", () => {
    // 65問 = 1問80秒で約87分 → 5分単位に切り上げて90分
    expect(buildWithQuestions(65)).toBe("90分");
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

// モジュール / レッスン / トピックの並び = ディレクトリ名の並び。辞書順だと
// `m10-mock-exam` が `m1` と `m2` の間に割り込み、模擬試験を最後に置けない。
describe("buildContentManifest — セクションの並び", () => {
  it("2 桁のモジュールが 1 桁の後ろに並ぶ", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-order-"));
    const courseDir = join(root, "demo-course");
    try {
      const modules = ["m1-a", "m2-b", "m9-c", "m10-mock"];
      for (const moduleDir of modules) {
        const lessonDir = join(courseDir, "modules", moduleDir, "l1-x");
        mkdirSync(join(lessonDir, "t1-y"), { recursive: true });
        const id = `${moduleDir.slice(1).split("-")[0]}-1-1`;
        writeFileSync(
          join(lessonDir, "t1-y", "slides.md"),
          `---\nid: ${id}\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n`,
        );
        writeFileSync(join(lessonDir, "doc.md"), "# ドキュメント\n");
        writeFileSync(join(lessonDir, "practice.md"), "# 演習\n");
      }
      writeFileSync(join(courseDir, "course.json"), JSON.stringify({ title: "デモ講座" }));

      const sections = buildContentManifest(root).courses[0].sections;
      expect(sections?.map((s) => s.id)).toEqual(modules);
      expect(sections?.at(-1)?.lessons[0].id).toBe("10-1-1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // 実講座でも見ておく。course.json への登録漏れや配線ミスは一時ディレクトリでは出ない。
  it("fe-kamoku-a の模擬試験 (M10) が最後のセクションに来る", () => {
    const fe = buildContentManifest().courses.find((c) => c.id === "fe-kamoku-a");
    expect(fe?.sections?.[0].id).toBe("m1-foundations");
    expect(fe?.sections?.at(-1)?.id).toBe("m10-mock-exam");
    expect(fe?.sections?.at(-1)?.title).toBe("M10. 模擬試験");
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

describe("buildContentManifest — 講座サムネイル", () => {
  /** 講座 1 つぶんの最小構成。thumbnail を置くかは呼び出し側が決める。 */
  function writeCourse(root: string, slug: string, config: Record<string, unknown> = {}) {
    const courseDir = join(root, slug);
    const topic = join(courseDir, "modules", "m0-x", "l1-y", "t1-z");
    mkdirSync(topic, { recursive: true });
    writeFileSync(join(courseDir, "course.json"), JSON.stringify({ title: "デモ講座", ...config }));
    writeFileSync(
      join(topic, "slides.md"),
      '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n',
    );
    writeFileSync(join(courseDir, "modules", "m0-x", "l1-y", "doc.md"), "# ドキュメント\n");
    writeFileSync(join(courseDir, "modules", "m0-x", "l1-y", "practice.md"), "# 演習\n");
    return courseDir;
  }

  it("thumbnail.png があれば内容ハッシュ入りの R2 キーが付く", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-"));
    try {
      const courseDir = writeCourse(root, "demo-course", { tenantId: "ses" });
      writeFileSync(join(courseDir, "thumbnail.png"), "fake-png-bytes");

      const { courses } = buildContentManifest(root);
      expect(courses[0].thumbnailPath).toMatch(
        /^tenant\/ses\/courses\/demo-course\/thumbnail-[0-9a-f]{8}\.png$/,
      );
      // アップロード側と seed 側でキーがずれると 404 を配ることになる。
      const [thumb] = collectCourseThumbnails(root);
      expect(thumb.key).toBe(courses[0].thumbnailPath);
      expect(thumb.contentType).toBe("image/png");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // 検査 (scripts/check_thumbnails.mjs) が受け入れる拡張子を manifest が拾わないと、
  // CI は通るのに R2 にも D1 にも載らない画像ができる。両者の候補リストを縛る。
  it("検査スクリプトと同じ拡張子をすべて拾う", () => {
    const candidates = readFileSync(
      join(import.meta.dirname, "..", "scripts", "check_thumbnails.mjs"),
      "utf8",
    ).match(/const CANDIDATES = \[([^\]]+)\]/)?.[1];
    const names = [...(candidates ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const root = mkdtempSync(join(tmpdir(), "manifest-thumb-ext-"));
      try {
        const courseDir = writeCourse(root, "demo-course");
        writeFileSync(join(courseDir, name), "fake");
        const [thumb] = collectCourseThumbnails(root);
        expect(buildContentManifest(root).courses[0].thumbnailPath, name).toBe(thumb?.key);
        const ext = name.slice(name.lastIndexOf("."));
        expect(thumb?.key, name).toMatch(new RegExp(`/thumbnail-[0-9a-f]{8}\\${ext}$`));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("キーは中身が変わると変わる (差し替えがキャッシュを跨がない)", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-hash-"));
    try {
      const courseDir = writeCourse(root, "demo-course");
      writeFileSync(join(courseDir, "thumbnail.png"), "before");
      const before = buildContentManifest(root).courses[0].thumbnailPath;
      writeFileSync(join(courseDir, "thumbnail.png"), "after");
      const after = buildContentManifest(root).courses[0].thumbnailPath;
      expect(before).not.toBe(after);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // seed (export-seed-sql.ts) は教材コースを emitCourse("ses", ...) 固定で入れる。
  // キーだけ別テナントを名乗ると、ses のコース行が他テナントのプレフィクスを指し、
  // そのテナントの r2:orphans が配信中のサムネイルを孤児として消せてしまう。
  it("R2 キーのテナントは seed と同じ ses に固定される", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-tenant-"));
    try {
      const courseDir = writeCourse(root, "demo-course", { tenantId: "ses" });
      writeFileSync(join(courseDir, "thumbnail.webp"), "fake");
      expect(buildContentManifest(root).courses[0].thumbnailPath).toContain("tenant/ses/");
      expect(collectCourseThumbnails(root)[0].tenantId).toBe("ses");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("seed が扱えないテナントを course.json に書いたらビルドで落とす", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-tenant-ng-"));
    try {
      writeCourse(root, "demo-course", { tenantId: "coach" });
      expect(() => buildContentManifest(root)).toThrow(/tenantId は "ses" のみ対応/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("画像が無ければ thumbnailPath は付かない (色のストライプ表示にフォールバック)", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-none-"));
    try {
      writeCourse(root, "demo-course");
      expect(buildContentManifest(root).courses[0].thumbnailPath).toBeUndefined();
      expect(collectCourseThumbnails(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("course.json の thumbnail が指すファイルが無ければビルドを落とす", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-missing-"));
    try {
      writeCourse(root, "demo-course", { thumbnail: "cover.png" });
      expect(() => buildContentManifest(root)).toThrow(/thumbnail が指すファイルがありません/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("講座ディレクトリの外を指す thumbnail は拒否する", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-escape-"));
    try {
      writeCourse(root, "demo-course", { thumbnail: "../secret.png" });
      expect(() => buildContentManifest(root)).toThrow(/相対パスにしてください/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// スキルツリー用の 3 フィールド (prerequisites / canDo / theme)。前提はハードロックに
// なるので、綴り違い・自己参照・循環はここで落とす。
describe("buildContentManifest — スキルツリーのフィールド", () => {
  /** slug ごとに course.json の追加フィールドを差し替えられる最小の講座群を作る。 */
  function writeCourses(root: string, configs: Record<string, Record<string, unknown>>): void {
    for (const [slug, extra] of Object.entries(configs)) {
      const topic = join(root, slug, "modules", "m0-x", "l1-y", "t1-z");
      mkdirSync(topic, { recursive: true });
      writeFileSync(
        join(root, slug, "course.json"),
        JSON.stringify({ title: `${slug} 講座`, category: "プログラミング", ...extra }),
      );
      writeFileSync(
        join(topic, "slides.md"),
        '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n',
      );
      writeFileSync(join(root, slug, "modules", "m0-x", "l1-y", "doc.md"), "# ドキュメント\n");
      writeFileSync(join(root, slug, "modules", "m0-x", "l1-y", "practice.md"), "# 演習\n");
    }
  }

  function withCourses(
    configs: Record<string, Record<string, unknown>>,
    run: (root: string) => void,
  ): void {
    const root = mkdtempSync(join(tmpdir(), "manifest-skillmap-"));
    try {
      writeCourses(root, configs);
      run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("prerequisites / canDo / theme が manifest に載る", () => {
    withCourses(
      {
        "a-basics": { canDo: "A ができる", theme: "テーマ" },
        "b-basics": { prerequisites: ["a-basics"], canDo: "B ができる", theme: "テーマ" },
      },
      (root) => {
        const { courses } = buildContentManifest(root);
        const b = courses.find((c) => c.id === "b-basics");
        expect(b?.prerequisites).toEqual(["a-basics"]);
        expect(b?.canDo).toBe("B ができる");
        expect(b?.theme).toBe("テーマ");
      },
    );
  });

  it("書いていない講座は 3 つとも未設定のまま (前提なし扱い)", () => {
    withCourses({ "a-basics": {} }, (root) => {
      const a = buildContentManifest(root).courses[0];
      expect(a?.prerequisites).toBeUndefined();
      expect(a?.canDo).toBeUndefined();
      expect(a?.theme).toBeUndefined();
    });
  });

  it("空配列の prerequisites は前提なしに畳む", () => {
    withCourses({ "a-basics": { prerequisites: [] } }, (root) => {
      expect(buildContentManifest(root).courses[0]?.prerequisites).toBeUndefined();
    });
  });

  it("存在しない slug を前提に書いたらビルドで落ちる", () => {
    withCourses({ "a-basics": { prerequisites: ["typo-basics"] } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/存在しない講座/);
    });
  });

  it("自分自身を前提に書いたらビルドで落ちる", () => {
    withCourses({ "a-basics": { prerequisites: ["a-basics"] } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/自分自身/);
    });
  });

  it("前提が循環したらビルドで落ちる", () => {
    withCourses(
      {
        "a-basics": { prerequisites: ["b-basics"] },
        "b-basics": { prerequisites: ["a-basics"] },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/循環/);
      },
    );
  });

  it("prerequisites の重複はビルドで落ちる", () => {
    withCourses(
      {
        "a-basics": {},
        "b-basics": { prerequisites: ["a-basics", "a-basics"] },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/重複/);
      },
    );
  });

  it("canDo / theme が空文字ならビルドで落ちる", () => {
    withCourses({ "a-basics": { canDo: "  " } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/canDo/);
    });
  });
});

// 実データ側の作り込み。次フェーズ (ホームのステージマップ) が読む前提なので、
// 欠けたまま気付かずに進まないよう manifest 全体で検査する。
describe("buildContentManifest — 実データのスキルツリー", () => {
  const { courses } = buildContentManifest();

  it("全講座に canDo と theme がある", () => {
    const missing = courses.filter((c) => !c.canDo || !c.theme).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it("theme はカテゴリごとに 1 つ", () => {
    const byCategory = new Map<string, Set<string>>();
    for (const c of courses) {
      const themes = byCategory.get(c.category) ?? new Set<string>();
      themes.add(c.theme ?? "");
      byCategory.set(c.category, themes);
    }
    for (const [category, themes] of byCategory) {
      expect([...themes], `カテゴリ ${category} のテーマ`).toHaveLength(1);
    }
  });

  it("Claude Code 入門は 2 本の前提を持つ", () => {
    const claudeCode = courses.find((c) => c.id === "claude-code-basics");
    expect(claudeCode?.prerequisites).toEqual(["ai-fluency-basics", "claude-chat-basics"]);
  });

  it("前提を 1 つも持たない講座 (入口) が残っている", () => {
    const entries = courses.filter((c) => (c.prerequisites ?? []).length === 0);
    expect(entries.length).toBeGreaterThan(0);
  });
});
