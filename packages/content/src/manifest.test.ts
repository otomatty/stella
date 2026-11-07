import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SKILL_MAP_APPEARANCE_PREREQUISITES,
  SKILL_MAP_APPEARANCES,
} from "../../shared/src/skill-map/appearances.js";
import { SKILL_MAP_ISLAND_CATEGORIES } from "../../shared/src/skill-map/islands.js";
import { describe, expect, it } from "vitest";
import { buildContentManifest, collectStageThumbnails } from "./manifest.js";
import { LEARNING_PROGRAM_SLUGS } from "../../shared/src/study/pace.js";

describe("buildContentManifest", () => {
  const { stages, quizzes } = buildContentManifest();
  const sample = stages.find((c) => c.id === "salesforce-dev-basics");
  if (!sample) throw new Error("salesforce-dev-basics stage missing");
  const sampleQuizzes = quizzes.filter((q) => q.stageId === "salesforce-dev-basics");

  it("stages/ 配下のステージを stage.json から組み立てる", () => {
    expect(stages.map((c) => c.id)).toContain("salesforce-dev-basics");
    expect(sample.category).toBe("Salesforce案件");
    expect(sample.title).toBe("Salesforce 開発 入門");
  });

  it("標準18ステージの予定時間が教材から入り、合計1260時間になる", () => {
    const program = stages.filter((stage) =>
      (LEARNING_PROGRAM_SLUGS as readonly string[]).includes(stage.id),
    );
    expect(program).toHaveLength(18);
    expect(program.every((stage) => (stage.duration ?? 0) > 0)).toBe(true);
    expect(program.reduce((sum, stage) => sum + (stage.duration ?? 0), 0)).toBe(1260);
  });

  it("旧形式でも予定時間をそのまま使い、未設定は空のまま、不正値は拒否する", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-planned-hours-"));
    const stageDir = join(root, "legacy");
    mkdirSync(join(stageDir, "modules"), { recursive: true });
    const file = join(stageDir, "stage.json");
    try {
      writeFileSync(file, JSON.stringify({ title: "旧ステージ", plannedHours: 27.5 }));
      expect(buildContentManifest(root).stages[0].duration).toBe(27.5);
      writeFileSync(file, JSON.stringify({ title: "旧ステージ" }));
      expect(buildContentManifest(root).stages[0].duration).toBeUndefined();
      writeFileSync(file, JSON.stringify({ title: "旧ステージ", plannedHours: -1 }));
      expect(() => buildContentManifest(root)).toThrow(/plannedHours/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("Section はモジュール 7 個", () => {
    expect(sample.sections).toHaveLength(7);
    expect(sample.sections?.[0].id).toBe("m0-orientation");
  });

  it("トピックが slides レッスンになり、本文と枚数を持つ", () => {
    const m1 = sample.sections?.find((s) => s.id === "m0-orientation");
    const lesson = m1?.lessons.find((l) => l.id === "0-1-1");
    expect(lesson?.type).toBe("slides");
    expect(lesson?.title).toBe("Salesforceは何を提供しているか");
    expect(lesson?.pdfPath).toBeUndefined();
    expect(lesson?.markdown).toContain("プラットフォーム");
    expect(lesson?.totalPages).toBeGreaterThanOrEqual(4);
    expect(lesson?.totalPages).toBeLessThanOrEqual(6);
  });

  it("スライド本文から講師ノートが除かれている", () => {
    const m1 = sample.sections?.find((s) => s.id === "m0-orientation");
    const lesson = m1?.lessons.find((l) => l.id === "0-1-1");
    expect(lesson?.markdown).not.toContain("ノート:");
  });

  it("スライド本文の画像も R2 の絶対パスに書き換わる", () => {
    const slides = sample.sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    for (const l of slides ?? []) {
      expect(l.markdown ?? "").not.toMatch(/!\[[^\]]*\]\(assets\//);
    }
  });

  // 描画側 (apps/web の MarkdownSlides) は markdown を `\n---\n` で割り、空チャンクを捨てて
  // 総ページ数を決める。splitSlides は捨てないので、空スライドが 1 枚でもあれば画面の
  // 「n / 総数」と D1 の totalPages がずれる。これが落ちたら desync が現実になった合図。
  it("スライド本文に空ページが無く、分割数が totalPages と一致する", () => {
    const slides = sample.sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
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
    const m1 = sample.sections?.find((s) => s.id === "m0-orientation");
    expect(m1?.lessons.filter((l) => l.type === "text").map((l) => l.id)).toContain("doc-0-1");
    expect(m1?.lessons.filter((l) => l.type === "quiz").map((l) => l.id)).toContain("quiz-0-1");
  });

  it("doc の markdown は画像を R2 の絶対 URL に書き換える", () => {
    const m1 = sample.sections?.find((s) => s.id === "m0-orientation");
    const doc = m1?.lessons.find((l) => l.id === "doc-0-1");
    expect(doc?.markdown).toContain(
      "tenant/ses/courses/salesforce-dev-basics/assets/t1-what-is-salesforce/platform-stack.svg",
    );
    expect(doc?.markdown).not.toMatch(/\]\(t\d-/);
  });

  it("quiz レッスンごとに QuizSeed がある", () => {
    const quizLessonIds = sample.sections
      ?.flatMap((s) => s.lessons)
      .filter((l) => l.type === "quiz")
      .map((l) => l.id);
    expect(sampleQuizzes.map((q) => q.lessonId).sort()).toEqual(quizLessonIds?.sort());
    expect(sampleQuizzes.every((q) => q.stageId === "salesforce-dev-basics")).toBe(true);
  });

  it("全 34 トピックが載る", () => {
    const slides = sample.sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    expect(slides).toHaveLength(34);
  });

  // parseQuiz は「## 確認クイズ」節が無いと黙って [] を返す。見出しの改名で
  // レッスン 1 本ぶんの小テストが無言で消えるのを、ここで止める。
  it("全 9 レッスンに確認クイズがある", () => {
    expect(sampleQuizzes).toHaveLength(9);
    for (const q of sampleQuizzes) expect(q.questions.length).toBeGreaterThan(0);
  });

  it("manifest の本文に LMS で解決できない相対リンクが残っていない", () => {
    const all = sample.sections?.flatMap((s) => s.lessons) ?? [];
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
        join(root, "gamma-basics", "stage.json"),
        JSON.stringify({ title: "gamma ステージ" }),
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
      const { stages } = buildContentManifest(root);
      const quiz = stages[0]?.sections?.[0]?.lessons.find((l) => l.type === "quiz");
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

describe("buildContentManifest — 複数ステージ", () => {
  it("stages/ に並んだステージをそれぞれ組み立てる", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-multi-"));
    try {
      for (const slug of ["alpha-basics", "beta-basics"]) {
        const topic = join(root, slug, "modules", "m0-x", "l1-y", "t1-z");
        mkdirSync(topic, { recursive: true });
        writeFileSync(
          join(root, slug, "stage.json"),
          JSON.stringify({
            title: `${slug} ステージ`,
            category: "プログラミング",
            color: "indigo",
          }),
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
            "**A** — ステージごとの設問",
            "",
            "</details>",
            "",
          ].join("\n"),
        );
      }
      const { stages, quizzes } = buildContentManifest(root);
      expect(stages.map((c) => c.id)).toEqual(["alpha-basics", "beta-basics"]);
      expect(stages.map((c) => c.title)).toEqual(["alpha-basics ステージ", "beta-basics ステージ"]);
      expect(quizzes.map((q) => q.stageId)).toEqual(["alpha-basics", "beta-basics"]);
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
    const stageDir = join(root, "demo-stage");
    try {
      const modules = ["m1-a", "m2-b", "m9-c", "m10-mock"];
      for (const moduleDir of modules) {
        const lessonDir = join(stageDir, "modules", moduleDir, "l1-x");
        mkdirSync(join(lessonDir, "t1-y"), { recursive: true });
        const id = `${moduleDir.slice(1).split("-")[0]}-1-1`;
        writeFileSync(
          join(lessonDir, "t1-y", "slides.md"),
          `---\nid: ${id}\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n`,
        );
        writeFileSync(join(lessonDir, "doc.md"), "# ドキュメント\n");
        writeFileSync(join(lessonDir, "practice.md"), "# 演習\n");
      }
      writeFileSync(join(stageDir, "stage.json"), JSON.stringify({ title: "デモステージ" }));

      const sections = buildContentManifest(root).stages[0].sections;
      expect(sections?.map((s) => s.id)).toEqual(modules);
      expect(sections?.at(-1)?.lessons[0].id).toBe("10-1-1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // 実ステージでも見ておく。stage.json への登録漏れや配線ミスは一時ディレクトリでは出ない。
  it("fe-kamoku-a の模擬試験 (M10) が最後のセクションに来る", () => {
    const fe = buildContentManifest().stages.find((c) => c.id === "fe-kamoku-a");
    expect(fe?.sections?.[0].id).toBe("m1-foundations");
    expect(fe?.sections?.at(-1)?.id).toBe("m10-mock-exam");
    expect(fe?.sections?.at(-1)?.title).toBe("M10. 模擬試験");
  });
});

describe("buildContentManifest — コード演習の配線", () => {
  function writeStage(root: string, exercises: unknown) {
    const topic = join(root, "demo-stage", "modules", "m0-x", "l1-y", "t1-z");
    mkdirSync(topic, { recursive: true });
    writeFileSync(
      join(root, "demo-stage", "stage.json"),
      JSON.stringify({ title: "デモステージ", exercises }),
    );
    writeFileSync(
      join(topic, "slides.md"),
      '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n',
    );
    writeFileSync(
      join(root, "demo-stage", "modules", "m0-x", "l1-y", "doc.md"),
      "# ドキュメント\n",
    );
    writeFileSync(join(root, "demo-stage", "modules", "m0-x", "l1-y", "practice.md"), "# 演習\n");
  }

  it("exercises のレッスンキーから type:code のレッスンが生える", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-code-"));
    try {
      writeStage(root, {
        "0-1": [{ id: "S0-Sql-Ch00-01-select-hello", title: "SQL: 数値を SELECT する" }],
      });
      const { stages } = buildContentManifest(root);
      const lessons = stages[0].sections?.[0].lessons ?? [];
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
      writeStage(root, { "9-9": [{ id: "X", title: "宙に浮いた演習" }] });
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
      const stageDir = join(root, "demo-stage");
      const topic = join(stageDir, "modules", "m0-x", "l1-y", "t1-z");
      mkdirSync(topic, { recursive: true });
      writeFileSync(
        join(stageDir, "stage.json"),
        JSON.stringify({ title: "デモステージ", category: "プログラミング", color: "indigo" }),
      );
      const crlf = (s: string) => s.replace(/\n/g, "\r\n");
      writeFileSync(
        join(topic, "slides.md"),
        crlf('---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n'),
      );
      writeFileSync(
        join(stageDir, "modules", "m0-x", "l1-y", "doc.md"),
        crlf("# ドキュメント\n\n本文\n"),
      );
      writeFileSync(join(stageDir, "modules", "m0-x", "l1-y", "practice.md"), crlf("# 演習\n"));

      const { stages } = buildContentManifest(root);
      for (const l of stages[0].sections?.[0].lessons ?? []) {
        expect(l.markdown ?? "").not.toContain("\r");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("buildContentManifest — ステージサムネイル", () => {
  /** ステージ 1 つぶんの最小構成。thumbnail を置くかは呼び出し側が決める。 */
  function writeStage(root: string, slug: string, config: Record<string, unknown> = {}) {
    const stageDir = join(root, slug);
    const topic = join(stageDir, "modules", "m0-x", "l1-y", "t1-z");
    mkdirSync(topic, { recursive: true });
    writeFileSync(
      join(stageDir, "stage.json"),
      JSON.stringify({ title: "デモステージ", ...config }),
    );
    writeFileSync(
      join(topic, "slides.md"),
      '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n\n---\n\n# 2枚目\n',
    );
    writeFileSync(join(stageDir, "modules", "m0-x", "l1-y", "doc.md"), "# ドキュメント\n");
    writeFileSync(join(stageDir, "modules", "m0-x", "l1-y", "practice.md"), "# 演習\n");
    return stageDir;
  }

  it("thumbnail.png があれば内容ハッシュ入りの R2 キーが付く", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-"));
    try {
      const stageDir = writeStage(root, "demo-stage", { tenantId: "ses" });
      writeFileSync(join(stageDir, "thumbnail.png"), "fake-png-bytes");

      const { stages } = buildContentManifest(root);
      expect(stages[0].thumbnailPath).toMatch(
        /^tenant\/ses\/courses\/demo-stage\/thumbnail-[0-9a-f]{8}\.png$/,
      );
      // アップロード側と seed 側でキーがずれると 404 を配ることになる。
      const [thumb] = collectStageThumbnails(root);
      expect(thumb.key).toBe(stages[0].thumbnailPath);
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
        const stageDir = writeStage(root, "demo-stage");
        writeFileSync(join(stageDir, name), "fake");
        const [thumb] = collectStageThumbnails(root);
        expect(buildContentManifest(root).stages[0].thumbnailPath, name).toBe(thumb?.key);
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
      const stageDir = writeStage(root, "demo-stage");
      writeFileSync(join(stageDir, "thumbnail.png"), "before");
      const before = buildContentManifest(root).stages[0].thumbnailPath;
      writeFileSync(join(stageDir, "thumbnail.png"), "after");
      const after = buildContentManifest(root).stages[0].thumbnailPath;
      expect(before).not.toBe(after);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // seed (export-seed-sql.ts) は教材コースを emitStage("ses", ...) 固定で入れる。
  // キーだけ別テナントを名乗ると、ses のコース行が他テナントのプレフィクスを指し、
  // そのテナントの r2:orphans が配信中のサムネイルを孤児として消せてしまう。
  it("R2 キーのテナントは seed と同じ ses に固定される", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-tenant-"));
    try {
      const stageDir = writeStage(root, "demo-stage", { tenantId: "ses" });
      writeFileSync(join(stageDir, "thumbnail.webp"), "fake");
      expect(buildContentManifest(root).stages[0].thumbnailPath).toContain("tenant/ses/");
      expect(collectStageThumbnails(root)[0].tenantId).toBe("ses");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("seed が扱えないテナントを stage.json に書いたらビルドで落とす", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-tenant-ng-"));
    try {
      writeStage(root, "demo-stage", { tenantId: "coach" });
      expect(() => buildContentManifest(root)).toThrow(/tenantId は "ses" のみ対応/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("画像が無ければ thumbnailPath は付かない (色のストライプ表示にフォールバック)", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-none-"));
    try {
      writeStage(root, "demo-stage");
      expect(buildContentManifest(root).stages[0].thumbnailPath).toBeUndefined();
      expect(collectStageThumbnails(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stage.json の thumbnail が指すファイルが無ければビルドを落とす", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-missing-"));
    try {
      writeStage(root, "demo-stage", { thumbnail: "cover.png" });
      expect(() => buildContentManifest(root)).toThrow(/thumbnail が指すファイルがありません/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ステージディレクトリの外を指す thumbnail は拒否する", () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-thumb-escape-"));
    try {
      writeStage(root, "demo-stage", { thumbnail: "../secret.png" });
      expect(() => buildContentManifest(root)).toThrow(/相対パスにしてください/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// スキルツリー用のフィールド (prerequisites / canDo / theme / appearances)。前提はハードロックに
// なるので、綴り違い・自己参照・循環はここで落とす。
describe("buildContentManifest — スキルツリーのフィールド", () => {
  /** slug ごとに stage.json の追加フィールドを差し替えられる最小のステージ群を作る。 */
  function writeStages(root: string, configs: Record<string, Record<string, unknown>>): void {
    for (const [slug, extra] of Object.entries(configs)) {
      const topic = join(root, slug, "modules", "m0-x", "l1-y", "t1-z");
      mkdirSync(topic, { recursive: true });
      writeFileSync(
        join(root, slug, "stage.json"),
        JSON.stringify({ title: `${slug} ステージ`, category: "プログラミング", ...extra }),
      );
      writeFileSync(
        join(topic, "slides.md"),
        '---\nid: 0-1-1\ntitle: テスト\ntakeaway: "て"\n---\n\n# 1枚目\n',
      );
      writeFileSync(join(root, slug, "modules", "m0-x", "l1-y", "doc.md"), "# ドキュメント\n");
      writeFileSync(join(root, slug, "modules", "m0-x", "l1-y", "practice.md"), "# 演習\n");
    }
  }

  function withStages(
    configs: Record<string, Record<string, unknown>>,
    run: (root: string) => void,
  ): void {
    const root = mkdtempSync(join(tmpdir(), "manifest-skillmap-"));
    try {
      writeStages(root, configs);
      run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("prerequisites / canDo / theme が manifest に載る", () => {
    withStages(
      {
        "a-basics": { canDo: "A ができる", theme: "テーマ" },
        "b-basics": { prerequisites: ["a-basics"], canDo: "B ができる", theme: "テーマ" },
      },
      (root) => {
        const { stages } = buildContentManifest(root);
        const b = stages.find((c) => c.id === "b-basics");
        expect(b?.prerequisites).toEqual(["a-basics"]);
        expect(b?.canDo).toBe("B ができる");
        expect(b?.theme).toBe("テーマ");
      },
    );
  });

  it("appearances が manifest に載る", () => {
    withStages(
      {
        "a-basics": { canDo: "A ができる", theme: "テーマ" },
        "b-basics": {
          prerequisites: ["a-basics"],
          canDo: "B ができる",
          theme: "テーマ",
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: {
            フロントエンド: ["a-basics"],
            バックエンド: ["a-basics"],
          },
        },
      },
      (root) => {
        const { stages } = buildContentManifest(root);
        expect(stages.find((c) => c.id === "b-basics")?.appearances).toEqual([
          "フロントエンド",
          "バックエンド",
        ]);
        expect(stages.find((c) => c.id === "a-basics")?.appearances).toBeUndefined();
      },
    );
  });

  it("appearances だけで appearancePrerequisites が無いと落ちる", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {
          prerequisites: ["a-basics"],
          appearances: ["フロントエンド", "バックエンド"],
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/appearancePrerequisites/);
      },
    );
  });

  it("appearancePrerequisites の和集合が prerequisites と違うと落ちる", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": {
          prerequisites: ["a-basics"],
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: {
            フロントエンド: ["a-basics"],
            バックエンド: ["b-basics"],
          },
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/和集合/);
      },
    );
  });

  it("prerequisites が 2 つ以上で parent が無いと落ちる", () => {
    withStages(
      { "a-basics": {}, "b-basics": {}, "c-basics": { prerequisites: ["a-basics", "b-basics"] } },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/parent/);
      },
    );
  });

  it("parent が prerequisites に無いと落ちる", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": { prerequisites: ["a-basics"], parent: "b-basics" },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/含めて/);
      },
    );
  });

  it("前提なしのステージに parent は書けない", () => {
    withStages({ "a-basics": {}, "b-basics": { parent: "a-basics" } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/含めて/);
    });
  });

  it("appearances と parent は併用できない (扇ごとの親は appearancePrerequisites)", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": {
          prerequisites: ["a-basics", "b-basics"],
          parent: "a-basics",
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: { フロントエンド: ["a-basics"], バックエンド: ["b-basics"] },
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/併用/);
      },
    );
  });

  it("parent は manifest に載る。前提 1 つなら省略しても補完される", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": { prerequisites: ["a-basics"] },
        "c-basics": { prerequisites: ["a-basics", "b-basics"], parent: "b-basics" },
      },
      (root) => {
        const { stages } = buildContentManifest(root);
        expect(stages.find((c) => c.id === "a-basics")?.parent).toBeUndefined();
        expect(stages.find((c) => c.id === "b-basics")?.parent).toBe("a-basics");
        expect(stages.find((c) => c.id === "c-basics")?.parent).toBe("b-basics");
      },
    );
  });

  it("appearances 持ちは扇が同じ前提でも parent を補完しない", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {
          prerequisites: ["a-basics"],
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: { フロントエンド: ["a-basics"], バックエンド: ["a-basics"] },
        },
      },
      (root) => {
        const { stages } = buildContentManifest(root);
        expect(stages.find((c) => c.id === "b-basics")?.parent).toBeUndefined();
      },
    );
  });

  it("appearancePrerequisites の扇に 2 つ書くと落ちる (扇ごとの親は 1 つ)", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": {
          prerequisites: ["a-basics", "b-basics"],
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: {
            フロントエンド: ["a-basics", "b-basics"],
            バックエンド: ["b-basics"],
          },
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/ちょうど 1 つ/);
      },
    );
  });

  it("書いていないステージは 3 つとも未設定のまま (前提なし扱い)", () => {
    withStages({ "a-basics": {} }, (root) => {
      const a = buildContentManifest(root).stages[0];
      expect(a?.prerequisites).toBeUndefined();
      expect(a?.canDo).toBeUndefined();
      expect(a?.theme).toBeUndefined();
    });
  });

  it("空配列の prerequisites は前提なしに畳む", () => {
    withStages({ "a-basics": { prerequisites: [] } }, (root) => {
      expect(buildContentManifest(root).stages[0]?.prerequisites).toBeUndefined();
    });
  });

  it("存在しない slug を前提に書いたらビルドで落ちる", () => {
    withStages({ "a-basics": { prerequisites: ["typo-basics"] } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/存在しないステージ/);
    });
  });

  it("自分自身を前提に書いたらビルドで落ちる", () => {
    withStages({ "a-basics": { prerequisites: ["a-basics"] } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/自分自身/);
    });
  });

  it("前提が循環したらビルドで落ちる", () => {
    withStages(
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
    withStages(
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
    withStages({ "a-basics": { canDo: "  " } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/canDo/);
    });
  });

  it("granted は前提を 1 つ以上必須", () => {
    withStages({ "x-basics": { audience: "granted" } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/granted.*prerequisites/);
    });
  });

  it("catalog が granted を prerequisites に書くと落ちる", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": { audience: "granted", prerequisites: ["a-basics"] },
        "c-basics": { prerequisites: ["b-basics"] },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/granted ステージ/);
      },
    );
  });

  it("granted → granted → catalog の鎖は通る", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": { audience: "granted", prerequisites: ["a-basics"] },
        "c-basics": { audience: "granted", prerequisites: ["b-basics"] },
      },
      (root) => {
        const { stages } = buildContentManifest(root);
        expect(stages.find((c) => c.id === "b-basics")?.audience).toBe("granted");
        expect(stages.find((c) => c.id === "c-basics")?.audience).toBe("granted");
        expect(stages.find((c) => c.id === "c-basics")?.prerequisites).toEqual(["b-basics"]);
      },
    );
  });

  it("catalog に着かない granted の鎖は落ちる", () => {
    withStages(
      {
        "a-basics": { audience: "granted", prerequisites: ["b-basics"] },
        "b-basics": { audience: "granted", prerequisites: ["a-basics"] },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/catalog ステージに着く必要があります/);
      },
    );
    withStages(
      {
        "a-basics": { audience: "granted", prerequisites: ["missing-basics"] },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(
          /存在しないステージ|catalog ステージに着く/,
        );
      },
    );
  });

  it("granted + appearances は落ちる", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": {
          audience: "granted",
          prerequisites: ["a-basics"],
          appearances: ["扇A", "扇B"],
          appearancePrerequisites: { 扇A: ["a-basics"], 扇B: ["a-basics"] },
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/appearances を書けません/);
      },
    );
  });

  it("正しい granted 親子は通る", () => {
    withStages(
      {
        "a-basics": {},
        "b-basics": { audience: "granted", prerequisites: ["a-basics"], canDo: "B", theme: "T" },
      },
      (root) => {
        const { stages } = buildContentManifest(root);
        expect(stages.find((c) => c.id === "b-basics")?.audience).toBe("granted");
      },
    );
  });
});

// 実データ側の作り込み。次フェーズ (ホームのステージマップ) が読む前提なので、
// 欠けたまま気付かずに進まないよう manifest 全体で検査する。
describe("buildContentManifest — 実データのスキルツリー", () => {
  const { stages } = buildContentManifest();

  it("全ステージに canDo と theme がある", () => {
    const missing = stages.filter((c) => !c.canDo || !c.theme).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it("theme はカテゴリごとに 1 つ", () => {
    const byCategory = new Map<string, Set<string>>();
    for (const c of stages) {
      const themes = byCategory.get(c.category) ?? new Set<string>();
      themes.add(c.theme ?? "");
      byCategory.set(c.category, themes);
    }
    for (const [category, themes] of byCategory) {
      expect([...themes], `カテゴリ ${category} のテーマ`).toHaveLength(1);
    }
  });

  it("複数の前提があるステージは parent で線を 1 本に決める", () => {
    expect(stages.find((c) => c.id === "dom-basics")?.prerequisites).toEqual([
      "html-css-basics",
      "javascript-basics",
      "javascript-data-basics",
    ]);
    expect(stages.find((c) => c.id === "dom-basics")?.parent).toBe("javascript-data-basics");
    expect(stages.find((c) => c.id === "dev-env-basics")?.parent).toBeUndefined();
  });

  it("新18ステージが準備中で、退役した19ステージはカタログに残らない", () => {
    const placeholders = [
      "dev-env-basics",
      "html-css-basics",
      "javascript-basics",
      "javascript-data-basics",
      "dom-basics",
      "ui-components-basics",
      "http-async-basics",
      "react-basics",
      "react-ui-basics",
      "ui-integration-basics",
      "node-api-basics",
      "sql-basics",
      "auth-basics",
      "nextjs-basics",
      "design-quality-basics",
      "deploy-ops-basics",
      "code-reading-basics",
      "fullstack-capstone",
    ];
    const retired = [
      "it-basics",
      "modern-css-basics",
      "page-composition-basics",
      "typescript-basics",
      "typescript-node-basics",
      "node-basics",
      "db-design-basics",
      "cli-basics",
      "git-basics",
      "fetch-api-basics",
      "npm-build-basics",
      "web-a11y-basics",
      "frontend-testing-basics",
      "rest-api-basics",
      "web-security-basics",
      "docker-basics",
      "cicd-basics",
      "linux-ops-basics",
      "observability-basics",
      "ai-fluency-basics",
      "claude-chat-basics",
      "claude-code-basics",
      "claude-code-skills",
      "claude-code-team",
      "claude-cowork-basics",
    ];
    expect(stages).toHaveLength(32);
    for (const slug of placeholders) {
      const stage = stages.find((c) => c.id === slug);
      expect(stage, slug).toBeDefined();
      expect(stage?.description).toMatch(/^【準備中】/);
      expect(stage?.sections).toHaveLength(1);
      expect(
        stage?.sections
          ?.flatMap((section) => section.lessons)
          .filter((lesson) => lesson.type === "slides"),
      ).toHaveLength(1);
      expect(
        stage?.sections
          ?.flatMap((section) => section.lessons)
          .some((lesson) => lesson.type === "code"),
      ).toBe(false);
      expect(stage?.thumbnailPath, slug).toBeDefined();
      expect(stage?.iconPath, slug).toBeDefined();
    }
    expect(stages.filter((c) => retired.includes(c.id))).toEqual([]);
  });

  it("appearances は実行時の正本 (@stella/shared) と一致する", () => {
    // 実行時に複製されるのは正本に載った slug だけ。教材が宣言しても正本に無ければ
    // 画面には 1 つしか出ないので、両者を 1 対 1 に保つ。
    const declared = stages.filter((c) => (c.appearances?.length ?? 0) > 0).map((c) => c.id);
    expect(declared.sort()).toEqual(Object.keys(SKILL_MAP_APPEARANCES).sort());
    for (const slug of declared) {
      const json = JSON.parse(
        readFileSync(join(import.meta.dirname, "..", "stages", slug, "stage.json"), "utf8"),
      ) as { appearances?: string[]; appearancePrerequisites?: Record<string, string[]> };
      expect(json.appearances, slug).toEqual(SKILL_MAP_APPEARANCES[slug]);
      expect(json.appearancePrerequisites, slug).toEqual(SKILL_MAP_APPEARANCE_PREREQUISITES[slug]);
    }
  });

  it("新ステージのカテゴリは基礎・フロントエンド・バックエンド・フルスタック", () => {
    const byCategory = (category: string) =>
      stages
        .filter((c) => c.category === category)
        .map((c) => c.id)
        .sort();
    expect(byCategory("基礎")).toEqual(["dev-env-basics"]);
    expect(byCategory("フロントエンド")).toEqual(
      [
        "html-css-basics",
        "javascript-basics",
        "javascript-data-basics",
        "dom-basics",
        "ui-components-basics",
        "http-async-basics",
        "react-basics",
        "react-ui-basics",
        "ui-integration-basics",
      ].sort(),
    );
    expect(byCategory("バックエンド")).toEqual(
      ["node-api-basics", "sql-basics", "auth-basics"].sort(),
    );
    expect(byCategory("Python")).toEqual(
      ["python-basics", "python-testing-ci-basics", "test-design-basics"].sort(),
    );
    expect(byCategory("フルスタック")).toEqual(
      [
        "nextjs-basics",
        "design-quality-basics",
        "deploy-ops-basics",
        "code-reading-basics",
        "fullstack-capstone",
      ].sort(),
    );
  });

  it("入口から2枝に分かれ、DOMから卒業制作まで線の親がつながる", () => {
    const chain = [
      "javascript-basics",
      "javascript-data-basics",
      "dom-basics",
      "ui-components-basics",
      "http-async-basics",
      "react-basics",
      "react-ui-basics",
      "ui-integration-basics",
      "node-api-basics",
      "sql-basics",
      "auth-basics",
      "nextjs-basics",
      "design-quality-basics",
      "deploy-ops-basics",
      "code-reading-basics",
      "fullstack-capstone",
    ];
    expect(stages.find((c) => c.id === "html-css-basics")?.parent).toBe("dev-env-basics");
    let parent = "dev-env-basics";
    for (const slug of chain) {
      const stage = stages.find((c) => c.id === slug);
      expect(stage?.parent, slug).toBe(parent);
      expect(stage?.prerequisites, slug).toContain(parent);
      parent = slug;
    }
  });

  it("残すステージの前提を新カリキュラムへ付け替える", () => {
    expect(stages.find((c) => c.id === "python-basics")?.prerequisites).toEqual([
      "node-api-basics",
    ]);
    expect(stages.find((c) => c.id === "python-testing-ci-basics")?.prerequisites).toEqual([
      "python-basics",
    ]);
    expect(stages.find((c) => c.id === "test-design-basics")?.prerequisites).toEqual([
      "python-testing-ci-basics",
    ]);
    expect(stages.find((c) => c.id === "networking-ops-basics")?.prerequisites).toEqual([
      "devops-basics",
    ]);
    expect(stages.find((c) => c.id === "kubernetes-basics")?.prerequisites).toEqual([
      "devops-basics",
      "networking-ops-basics",
      "deploy-ops-basics",
    ]);
    expect(stages.find((c) => c.id === "kubernetes-basics")?.parent).toBe("networking-ops-basics");
    expect(
      stages
        .filter((c) => c.category === "DevOps")
        .map((c) => c.id)
        .sort(),
    ).toEqual(
      ["devops-basics", "networking-ops-basics", "kubernetes-basics", "terraform-basics"].sort(),
    );
  });

  it("スキルツリーの見た目の枝はどの星からも 2 本まで (島への橋は数えない)", () => {
    // 島は実行時の正本から引く (ここで書き写すと、島を足したときに枝の数え方だけ古くなる)。
    const islandCategories = SKILL_MAP_ISLAND_CATEGORIES;
    const configs = new Map(
      stages.map((c) => {
        const json = JSON.parse(
          readFileSync(join(import.meta.dirname, "..", "stages", c.id, "stage.json"), "utf8"),
        ) as { appearancePrerequisites?: Record<string, string[]> };
        return [c.id, json] as const;
      }),
    );
    type Inst = { key: string; slug: string; sector: string; cluster: string; prereqs: string[] };
    const instances: Inst[] = [];
    for (const stage of stages) {
      const sectors =
        stage.appearances && stage.appearances.length > 0 ? stage.appearances : [stage.category];
      const cluster = islandCategories.has(stage.category) ? stage.category : "mainland";
      for (const sector of sectors) {
        const groups = configs.get(stage.id)?.appearancePrerequisites;
        instances.push({
          key: `${stage.id}::${sector}`,
          slug: stage.id,
          sector,
          cluster,
          prereqs: groups?.[sector] ?? (stage.parent ? [stage.parent] : []),
        });
      }
    }
    const bySlug = new Map<string, Inst[]>();
    for (const inst of instances) {
      bySlug.set(inst.slug, [...(bySlug.get(inst.slug) ?? []), inst]);
    }
    const children = new Map<string, string[]>();
    for (const child of instances) {
      for (const prereq of child.prereqs) {
        const copies = bySlug.get(prereq) ?? [];
        const parent =
          copies.find((p) => p.sector === child.sector) ??
          copies.find((p) => p.cluster === child.cluster) ??
          copies[0];
        if (!parent || parent.cluster !== child.cluster) continue;
        const list = children.get(parent.key) ?? [];
        if (!list.includes(child.slug)) list.push(child.slug);
        children.set(parent.key, list);
      }
    }
    const over = [...children.entries()]
      .filter(([, ch]) => ch.length > 2)
      .map(([key, ch]) => `${key} → ${ch.join(", ")}`);
    expect(over).toEqual([]);
    expect(children.get("dev-env-basics::基礎")?.sort()).toEqual([
      "html-css-basics",
      "javascript-basics",
    ]);
  });

  it("Salesforce 案件トラックは島に置いた専用星 (割り当てた受講者にだけ出す)", () => {
    const stage = stages.find((c) => c.id === "salesforce-dev-basics");
    expect(stage?.audience).toBe("granted");
    // 島に置くのは、本土の扇に混ぜると sql-basics の枝が 3 本になるため。
    // 島は「目的別の入り口」なので、案件トラックはこちらが本来の置き場所。
    expect(stage?.category).toBe("Salesforce案件");
    expect(SKILL_MAP_ISLAND_CATEGORIES.has("Salesforce案件")).toBe(true);
    expect(stage?.prerequisites).toEqual(["sql-basics"]);
    // catalog ステージの前提に専用星を書くと、割り当てのない受講者が永久ロックされる。
    for (const other of stages) {
      if (other.audience === "granted") continue;
      expect(other.prerequisites ?? [], other.id).not.toContain("salesforce-dev-basics");
    }
  });

  it("資格は AWS資格 / 情報処理資格 の島に分かれ、情報処理は 科目A → 科目B と段階進行", () => {
    expect(stages.find((c) => c.id === "aws-clf-c02-basics")?.category).toBe("AWS資格");
    expect(stages.find((c) => c.id === "fe-kamoku-a")?.category).toBe("情報処理資格");
    expect(stages.find((c) => c.id === "fe-kamoku-b")?.category).toBe("情報処理資格");
    expect(stages.find((c) => c.id === "aws-clf-c02-basics")?.prerequisites).toEqual([
      "dev-env-basics",
    ]);
    expect(stages.find((c) => c.id === "fe-kamoku-a")?.prerequisites).toEqual(["dev-env-basics"]);
    expect(stages.find((c) => c.id === "fe-kamoku-b")?.prerequisites).toEqual(["fe-kamoku-a"]);
  });

  it("Basic 以外は Extra (audience: granted)。Python 3 ステージは Python の島", () => {
    const granted = [
      "aws-clf-c02-basics",
      "fe-kamoku-a",
      "fe-kamoku-b",
      "claude-developer-foundations",
      "devlab-ts-prework",
      "csharp-foundations",
      "python-basics",
      "python-testing-ci-basics",
      "test-design-basics",
      "devops-basics",
      "networking-ops-basics",
      "terraform-basics",
      "kubernetes-basics",
      "salesforce-dev-basics",
    ];
    expect(
      stages
        .filter((c) => c.audience === "granted")
        .map((c) => c.id)
        .sort(),
    ).toEqual(granted.sort());
    const basic = new Set([
      "dev-env-basics",
      "html-css-basics",
      "javascript-basics",
      "javascript-data-basics",
      "dom-basics",
      "ui-components-basics",
      "http-async-basics",
      "react-basics",
      "react-ui-basics",
      "ui-integration-basics",
      "node-api-basics",
      "sql-basics",
      "auth-basics",
      "nextjs-basics",
      "design-quality-basics",
      "deploy-ops-basics",
      "code-reading-basics",
      "fullstack-capstone",
    ]);
    for (const stage of stages) {
      if (basic.has(stage.id)) expect(stage.audience, stage.id).toBeUndefined();
    }
    for (const slug of ["python-basics", "python-testing-ci-basics", "test-design-basics"]) {
      const stage = stages.find((c) => c.id === slug);
      expect(stage?.category, slug).toBe("Python");
      expect(stage?.theme, slug).toBe("Python とテストの力");
    }
  });

  it("dev-env-basics だけが前提なしの入口になる", () => {
    expect(stages.filter((c) => (c.prerequisites ?? []).length === 0).map((c) => c.id)).toEqual([
      "dev-env-basics",
    ]);
  });
});
