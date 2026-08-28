import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

function stableUuid(key: string): string {
  const h = createHash("sha1").update(key).digest();
  const bytes = Uint8Array.from(h.subarray(0, 16));
  const ver = bytes[6];
  const variant = bytes[8];
  if (ver === undefined || variant === undefined) {
    throw new Error("sha1 digest too short");
  }
  bytes[6] = (ver & 0x0f) | 0x50;
  bytes[8] = (variant & 0x3f) | 0x80;
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

  it("教材ステージを upsert する", () => {
    expect(sql).toContain("'typescript-basics'");
  });

  it("デモ講座は seed せず、安定 UUID だけ削除する", () => {
    const webFundamentals = stableUuid("course:ses:web-fundamentals");
    const reactIntro = stableUuid("course:ses:react-intro");
    expect(sql).not.toContain("Web開発基礎");
    // "Git / GitHub" は git-basics の practice.md 本文 (lesson_revisions のスナップ
    // ショット) に正当に現れるので、旧デモ講座の検査はステージ insert に限定する。
    expect(sql).not.toMatch(/insert into stages[^\n]*Git \/ GitHub/);
    expect(sql).not.toContain("React入門");
    expect(sql).toContain(`delete from stages where id = '${webFundamentals}'`);
    expect(sql).toContain(`delete from stages where id = '${reactIntro}'`);
    expect(sql).not.toMatch(/or \(tenant_id = '[^']+' and slug = '/);
    expect(sql).toContain(`delete from sections where stage_id = '${webFundamentals}';`);
    expect(sql).not.toContain(`delete from sections where stage_id = '${webFundamentals}');`);
  });

  it("slug を再利用した git-basics(Git 入門研修)は upsert し、旧デモ削除の対象にしない", () => {
    const gitBasics = stableUuid("course:ses:git-basics");
    expect(sql).toContain("'git-basics'");
    expect(sql).toContain("Git 入門研修");
    expect(sql).not.toContain(`delete from stages where id = '${gitBasics}'`);
  });

  it("本文リビジョンを、直前とハッシュが違うときだけ積む", () => {
    // slides / text は lessons.markdown、quiz は practice.md 全文がスナップショットになる。
    const quizLesson = stableUuid("lesson:ses:typescript-basics:quiz-1-1");
    expect(sql).toContain(
      `insert into lesson_revisions (lesson_id, revision, source_hash, markdown, source, created_by, created_at) select '${quizLesson}'`,
    );
    expect(sql).toMatch(
      new RegExp(
        `insert into lesson_revisions[^\\n]*'${quizLesson}'[\\s\\S]*?## 確認クイズ[\\s\\S]*?and coalesce\\(\\(select r\\.source_hash from lesson_revisions r where r\\.lesson_id = '${quizLesson}'`,
      ),
    );
  });

  it("スライドレッスンに本文 markdown が入る", () => {
    expect(sql).toMatch(
      /insert into lessons \([^)]*\)\s*select[\s\S]*?'slides'[\s\S]*?constは再代入できない/,
    );
  });

  it("図解画像は R2 の絶対パスで入る", () => {
    expect(sql).toContain("tenant/ses/courses/typescript-basics/assets/");
  });

  // サムネイルは stages.thumbnail_path が正本。列が upsert から落ちると、
  // 画像を差し替えても D1 が古いキーを指したままになる。
  it("stages の upsert は thumbnail_path を含む", () => {
    expect(sql).toMatch(/insert into stages \([^)]*\bthumbnail_path\b[^)]*\)/);
    expect(sql).toContain("thumbnail_path = excluded.thumbnail_path");
  });

  // スキルツリーの 3 列 (Phase 1)。教材 (course.json) が正本なので、列が upsert から
  // 落ちると「前提を足したのに誰も開けない / 外したのにロックが残る」が黙って起きる。
  it("stages の upsert は prerequisites / can_do / theme を含む", () => {
    expect(sql).toMatch(
      /insert into stages \([^)]*\bprerequisites\b[^)]*\bcan_do\b[^)]*\btheme\b[^)]*\)/,
    );
    expect(sql).toContain("prerequisites = excluded.prerequisites");
    expect(sql).toContain("can_do = excluded.can_do");
    expect(sql).toContain("theme = excluded.theme");
  });

  it("前提つきの講座は slug の JSON 配列で入る", () => {
    // modern-css-basics は html-css-basics を前提にしている (course.json)。
    const line = (sql.match(/^insert into stages .*'modern-css-basics'.*$/m) ?? [])[0];
    expect(line).toBeDefined();
    expect(line).toContain(`'["html-css-basics"]'`);
  });

  it("前提を書いていない講座は空配列ではなく null に畳む (ロックを残さない)", () => {
    // 教材が正本。course.json から前提を外したら D1 も null に戻る必要がある
    // ('[]' が残ると、読み直す側が「壊れた行」と区別できない)。
    const line = (sql.match(/^insert into stages .*'aws-clf-c02-basics'.*$/m) ?? [])[0];
    expect(line).toBeDefined();
    // 並びは ... status, prerequisites, can_do, theme, created_at, updated_at。
    expect(line).toMatch(/'published', null, '[^']*', '[^']*', cast\(unixepoch/);
    expect(line).not.toContain("'[]'");
  });

  it("quiz / quiz_questions / quiz_options を emit する", () => {
    expect(sql).toMatch(/insert into quizzes /);
    expect(sql).toMatch(/insert into quiz_questions /);
    expect(sql).toMatch(/insert into quiz_options /);
  });

  it("quizzes の insert は shuffle 列を書かない", () => {
    const inserts = sql.match(/^insert into quizzes .*$/gm) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const line of inserts) {
      expect(line).not.toMatch(/\bshuffle_questions\b/);
      expect(line).not.toMatch(/\bshuffle_options\b/);
    }
  });

  it("教材ステージの sections を stage_id だけで丸ごと wipe しない", () => {
    const tsStage = stableUuid("course:ses:typescript-basics");
    expect(sql).not.toContain(`delete from sections where stage_id = '${tsStage}';`);
    expect(sql).toContain(`delete from sections where stage_id = '${tsStage}' and id not in (`);
  });

  it("教材から消えた lesson / section を prune する", () => {
    expect(sql).toMatch(
      /delete from lessons where section_id in \(select id from sections where stage_id = '[^']+'\) and id not in \(/i,
    );
    expect(sql).toMatch(/delete from sections where stage_id = '[^']+' and id not in \(/i);
    expect(sql).toMatch(
      /delete from lesson_progress where lesson_id not in \(select id from lessons\)/i,
    );
  });

  it("sections は slug で既存ステージに紐づけて upsert する", () => {
    expect(sql).toMatch(
      /insert into sections \([^)]*\)\s*select[\s\S]*?\bfrom stages\b[\s\S]*?on conflict \(id\) do update/i,
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
    expect(sql).toMatch(/on conflict \(id\) do update set section_id = excluded\.section_id/i);
  });

  it("旧レッスン UUID からの進捗付け替えと quiz.lesson_id 更新を出す", () => {
    const mergeAt = sql.search(/update lesson_progress as dest set completed =/i);
    const deleteAt = sql.search(/delete from lesson_progress where id in \(/i);
    const remapAt = sql.search(/update lesson_progress set lesson_id = case lesson_id/i);
    expect(mergeAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(mergeAt);
    expect(remapAt).toBeGreaterThan(deleteAt);
    expect(sql).toMatch(/with map\(new_id, old_id\) as \(values /i);
    expect(sql).toMatch(/update quizzes set lesson_id = case lesson_id/i);
    expect(sql).toMatch(
      /on conflict \(id\) do update set lesson_id = excluded\.lesson_id, pass_score = excluded\.pass_score/i,
    );
  });

  it("レッスン ID 付け替えの各文は D1 の 100KB/query 制限に収まる", () => {
    const stmts = [...sql.matchAll(/with map\([^)]+\) as \(values [^;]+;/gi)];
    expect(stmts.length).toBeGreaterThan(0);
    for (const m of stmts) {
      const stmt = m[0];
      if (stmt === undefined) continue;
      expect(Buffer.byteLength(stmt) + 1).toBeLessThanOrEqual(100_000);
    }
  });

  it("旧 quiz UUID の受験履歴を新 UUID へ付け替えてから消す", () => {
    const newQuiz = stableUuid("quiz:ses:typescript-basics:quiz-1-1");
    const legacyQuiz = stableUuid("quiz:ses:quiz-1-1");
    expect(sql).toContain(
      `update quiz_attempts set quiz_id = '${newQuiz}' where quiz_id = '${legacyQuiz}'`,
    );
    expect(sql).toContain(
      `delete from quizzes where lesson_id = '${stableUuid("lesson:ses:typescript-basics:quiz-1-1")}' and id != '${newQuiz}'`,
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
    expect(sql).toContain("seed-sales");
    expect(sql).toContain("seed-submission-pending-1");
  });

  // 旧 category 列は contract リリース (#141) で drop 済み。 seed が書き戻すと
  // マイグレーション適用後の D1 で INSERT が落ちるため、 復活していないことを縛る。
  // (stages.category は別物なので interview_questions の文だけを見る。 1 文 = 1 行)
  it("面談対策の insert は categories のみで旧 category 列を書かない", () => {
    const inserts = sql.match(/^insert into interview_questions .*$/gm) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const line of inserts) {
      expect(line).toContain("insert into interview_questions (id, tenant_id, no, categories,");
      expect(line).toContain("set categories = excluded.categories");
      expect(line).not.toMatch(/\bcategory\b/);
    }
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

  it("教材ステージは残す", () => {
    expect(sql).toContain("'typescript-basics'");
    expect(sql).toMatch(/insert into lessons /);
  });

  it("デモ講座の削除は本番 seed でも出す", () => {
    expect(sql).toContain(
      `delete from stages where id = '${stableUuid("course:ses:web-fundamentals")}'`,
    );
    expect(sql).not.toContain("Web開発基礎");
  });
});

// quiz は教材ステージにだけ紐づける。fixtures 側に同じ lesson.id が現れても
// quiz を生やさないガードが消えたら落ちるよう、@falcon/content を差し替えて検証する。
vi.mock("@falcon/content", async () => {
  const collidingLessonId = "l1";

  return {
    // @falcon/content は「講座 = course」の語彙のまま (境界は export-seed-sql.ts)。
    buildContentManifest: () => ({
      courses: [
        {
          id: "typescript-basics",
          title: "教材ステージ（テスト用）",
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
          courseId: "typescript-basics",
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

describe("quiz の紐付けは教材ステージに限定される", () => {
  it("同じ lesson.id を持つ fixtures レッスンには quiz を emit しない", async () => {
    process.env.DIALECT = "sqlite";
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((s) => {
      logs.push(String(s));
    });
    await import("./export-seed-sql.js");
    spy.mockRestore();

    // 教材ステージ側の 1 件だけ。ガードが無ければ fixtures 側でも emit されて 2 件になる。
    expect(logs.join("\n").match(/^insert into quizzes /gm) ?? []).toHaveLength(1);
    // fixtures / problems を丸ごと in-process で読み込むので既定の 5s では足りない。
  }, 60_000);
});
