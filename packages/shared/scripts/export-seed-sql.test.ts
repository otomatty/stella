import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
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

/** seed-d1 と同じく stdout をファイルへ直接書く。Windows の大きな pipe 出力も避ける。 */
function exportSql(contentOnly = false): string {
  const dir = mkdtempSync(join(tmpdir(), "stella-seed-test-"));
  const file = join(dir, "seed.sql");
  const fd = openSync(file, "w");
  try {
    try {
      execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        stdio: ["ignore", fd, "inherit"],
        env: { ...process.env, DIALECT: "sqlite", CONTENT_ONLY: contentOnly ? "1" : "0" },
      });
    } finally {
      closeSync(fd);
    }
    return readFileSync(file, "utf8");
  } finally {
    unlinkSync(file);
    rmdirSync(dir);
  }
}

describe("export-seed-sql (sqlite)", () => {
  const sql = exportSql();

  it("教材ステージを upsert する", () => {
    expect(sql).toContain("'salesforce-dev-basics'");
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

  it("退役した19講座の安定 UUID を削除し、引き継ぐ6講座は削除しない", () => {
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
    ];
    for (const slug of retired) {
      const id = stableUuid(`course:ses:${slug}`);
      expect(sql.includes(`delete from stages where id = '${id}';`), slug).toBe(true);
      expect(sql.includes(`delete from enrollments where stage_id = '${id}';`), slug).toBe(true);
      expect(sql.includes(`delete from certificates where stage_id = '${id}';`), slug).toBe(true);
      expect(sql).not.toMatch(new RegExp(`^insert into stages .*'ses', '${slug}',`, "m"));
    }
    for (const slug of [
      "html-css-basics",
      "javascript-basics",
      "ui-components-basics",
      "react-basics",
      "sql-basics",
      "auth-basics",
    ]) {
      expect(sql, slug).not.toContain(
        `delete from stages where id = '${stableUuid(`course:ses:${slug}`)}';`,
      );
      expect(sql, slug).toMatch(new RegExp(`^insert into stages .*'ses', '${slug}',`, "m"));
    }
  });

  it("seed-learner の登録と提出は新しい入口に紐づく", () => {
    expect(sql).toContain("seed-enrollment-learner-dev-env-basics");
    expect(sql).toContain(stableUuid("lesson:ses:dev-env-basics:m0-l1-t1"));
    expect(sql).toContain("開発環境とWebの入口");
    expect(sql).not.toContain("seed-enrollment-learner-typescript-basics");
  });

  it("本文リビジョンを、直前とハッシュが違うときだけ積む", () => {
    // slides / text は lessons.markdown、quiz は practice.md 全文がスナップショットになる。
    const quizLesson = stableUuid("lesson:ses:salesforce-dev-basics:quiz-0-1");
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
      /insert into lessons \([^)]*\)\s*select[\s\S]*?'slides'[\s\S]*?プラットフォーム/,
    );
  });

  it("図解画像は R2 の絶対パスで入る", () => {
    expect(sql).toContain("tenant/ses/courses/salesforce-dev-basics/assets/");
  });

  // サムネイルは stages.thumbnail_path が正本。列が upsert から落ちると、
  // 画像を差し替えても D1 が古いキーを指したままになる。
  it("stages の upsert は thumbnail_path を含む", () => {
    expect(sql).toMatch(/insert into stages \([^)]*\bthumbnail_path\b[^)]*\)/);
    expect(sql).toContain("thumbnail_path = excluded.thumbnail_path");
  });

  // スキルツリーの講座アイコンは stages.icon_path が正本。列が upsert から落ちると、
  // アイコンを差し替えても D1 が古いキー (= 消えない旧 R2 オブジェクト) を指したままになる。
  it("stages の upsert は icon_path を含む", () => {
    expect(sql).toMatch(/insert into stages \([^)]*\bicon_path\b[^)]*\)/);
    expect(sql).toContain("icon_path = excluded.icon_path");
  });

  // スキルツリーの 3 列 (Phase 1)。教材 (course.json) が正本なので、列が upsert から
  // 落ちると「前提を足したのに誰も開けない / 外したのにロックが残る」が黙って起きる。
  it("stages の upsert は prerequisites / can_do / theme / audience を含む", () => {
    expect(sql).toMatch(
      /insert into stages \([^)]*\bprerequisites\b[^)]*\bcan_do\b[^)]*\btheme\b[^)]*\baudience\b[^)]*\)/,
    );
    expect(sql).toContain("prerequisites = excluded.prerequisites");
    expect(sql).toContain("can_do = excluded.can_do");
    expect(sql).toContain("theme = excluded.theme");
    expect(sql).toContain("audience = excluded.audience");
  });

  it("前提つきの講座は slug の JSON 配列で入る", () => {
    // dom-basics は複数の講座 を前提にしている (course.json)。
    const line = (sql.match(/^insert into stages .*'dom-basics'.*$/m) ?? [])[0];
    expect(line).toBeDefined();
    expect(line).toContain(`'["html-css-basics","javascript-basics","javascript-data-basics"]'`);
  });

  it("前提を書いていない講座は空配列ではなく null に畳む (ロックを残さない)", () => {
    // 教材が正本。course.json から前提を外したら D1 も null に戻る必要がある
    // ('[]' が残ると、読み直す側が「壊れた行」と区別できない)。
    // dev-env-basics はスキルツリーの入口 (唯一の前提なし講座)。
    // slug 列で拾う (parent 列に 'dev-env-basics' を持つ子の行と取り違えないため)。
    const line = (sql.match(/^insert into stages .*'ses', 'dev-env-basics',.*$/m) ?? [])[0];
    expect(line).toBeDefined();
    // 並びは ... status, prerequisites, parent, can_do, theme, audience, created_at, updated_at。
    expect(line).toMatch(/'published', null, null, '[^']*', '[^']*', 'catalog', cast\(unixepoch/);
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
    const tsStage = stableUuid("course:ses:salesforce-dev-basics");
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
    const withoutSection = stableUuid("lesson:ses:salesforce-dev-basics:0-1-1");
    const withSection = stableUuid("lesson:ses:salesforce-dev-basics:m0-orientation:0-1-1");
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
    const newQuiz = stableUuid("quiz:ses:salesforce-dev-basics:quiz-0-1");
    const legacyQuiz = stableUuid("quiz:ses:quiz-0-1");
    expect(sql).toContain(
      `update quiz_attempts set quiz_id = '${newQuiz}' where quiz_id = '${legacyQuiz}'`,
    );
    expect(sql).toContain(
      `delete from quizzes where lesson_id = '${stableUuid("lesson:ses:salesforce-dev-basics:quiz-0-1")}' and id != '${newQuiz}'`,
    );
  });

  it("設問と選択肢は upsert し、教材から消えた行だけ prune する", () => {
    const questionInserts = sql.match(/^insert into quiz_questions .*$/gm) ?? [];
    const optionInserts = sql.match(/^insert into quiz_options .*$/gm) ?? [];
    expect(questionInserts.length).toBeGreaterThan(0);
    expect(optionInserts.length).toBeGreaterThan(0);
    for (const line of questionInserts) {
      expect(line).toContain("on conflict (id) do update set");
      expect(line).toContain("prompt = excluded.prompt");
    }
    for (const line of optionInserts) {
      expect(line).toContain("on conflict (id) do update set");
      expect(line).toContain("label = excluded.label");
    }
    // 現行クイズの設問を無条件に消すと、cascade で復習カードが落ちる。
    expect(sql).not.toMatch(/^delete from quiz_questions where quiz_id = '[^']+';$/m);
    expect(sql).toMatch(/delete from quiz_questions where quiz_id = '[^']+' and id not in \(/);
    expect(sql).toMatch(
      /delete from quiz_options where question_id in \(select id from quiz_questions where quiz_id = '[^']+'\) and id not in \(/,
    );
    expect(sql).toMatch(/o\.is_correct <> /);
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

  it("既存 DB の退役講座と子レコードを削除し、再利用する講座の登録・修了証と CMS 講座を保持する", () => {
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const stageId = (slug: string) => stableUuid(`course:ses:${slug}`);
    const db = new DatabaseSync(":memory:");
    try {
      const migrations = join(root, "apps/api/drizzle");
      db.exec("pragma foreign_keys = off");
      for (const file of readdirSync(migrations)
        .filter((file) => file.endsWith(".sql"))
        .sort()) {
        db.exec(readFileSync(join(migrations, file), "utf8"));
      }
      db.exec("pragma foreign_keys = on");
      db.exec(sql);
      db.exec(`insert into profiles (id, tenant_id, role, display_name, created_at)
      values ('upgrade-learner', 'ses', 'student', '受講者', 1)`);

      const retired = stageId("typescript-basics");
      db.prepare(`insert into stages (id, tenant_id, slug, title, status, created_at, updated_at)
      values (?, 'ses', 'typescript-basics', '旧教材', 'published', 1, 1)`).run(retired);
      db.prepare(`insert into sections (id, stage_id, title, "order", created_at)
      values ('old-section', ?, '旧単元', 0, 1)`).run(retired);
      db.exec(`
      insert into lessons (id, section_id, title, type, "order", created_at, updated_at)
        values ('old-lesson', 'old-section', '旧課題', 'quiz', 0, 1, 1);
      insert into lesson_progress (id, tenant_id, user_id, lesson_id, completed, updated_at)
        values ('old-progress', 'ses', 'upgrade-learner', 'old-lesson', 1, 1);
      insert into lesson_materials (id, lesson_id, path, file_name, created_at)
        values ('old-material', 'old-lesson', 'old.pdf', 'old.pdf', 1);
      insert into lesson_revisions (lesson_id, revision, source_hash, markdown, source, created_at)
        values ('old-lesson', 1, 'old-hash', '旧本文', 'seed', 1);
      insert into submissions (id, tenant_id, student_id, lesson_id, stage_title, assignment_title, code, submitted_at)
        values ('old-submission', 'ses', 'upgrade-learner', 'old-lesson', '旧教材', '旧課題', '', 1);
      insert into quizzes (id, lesson_id, created_at, updated_at)
        values ('old-quiz', 'old-lesson', 1, 1);
      insert into quiz_questions (id, quiz_id, kind, created_at, updated_at)
        values ('old-question', 'old-quiz', 'single', 1, 1);
      insert into quiz_options (id, question_id) values ('old-option', 'old-question');
      insert into quiz_attempts (id, tenant_id, quiz_id, user_id, score, max_score, passed, submitted_at)
        values ('old-attempt', 'ses', 'old-quiz', 'upgrade-learner', 1, 1, 1, 1);
    `);
      const reused = [
        "html-css-basics",
        "javascript-basics",
        "ui-components-basics",
        "react-basics",
        "sql-basics",
        "auth-basics",
      ];
      for (const slug of ["typescript-basics", ...reused]) {
        db.prepare(`insert into enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at)
        values (?, 'ses', 'upgrade-learner', ?, 'active', 1)`).run(
          `enrollment-${slug}`,
          stageId(slug),
        );
        db.prepare(`insert into certificates (id, tenant_id, user_id, stage_id, cert_code, stage_title, recipient_name, tenant_name, issued_at)
        values (?, 'ses', 'upgrade-learner', ?, ?, '旧教材', '受講者', 'SES', 1)`).run(
          `certificate-${slug}`,
          stageId(slug),
          `CERT-${slug}`,
        );
      }
      db.prepare(`insert into announcements (id, tenant_id, stage_id, title, created_at, published_at)
      values ('old-announcement', 'ses', ?, '旧講座のお知らせ', 1, 1)`).run(retired);
      db.exec(`insert into stages (id, tenant_id, slug, title, status, created_at, updated_at)
      values ('cms-stage', 'ses', 'web-fundamentals', 'CMS 教材', 'published', 1, 1);
      insert into sections (id, stage_id, title, "order", created_at)
      values ('cms-section', 'cms-stage', 'CMS 単元', 0, 1)`);

      // 引き継ぐ stage の旧レッスンも消す。FK のない進捗・提出だけ残る事故を検出する。
      const html = stageId("html-css-basics");
      db.prepare(`insert into sections (id, stage_id, title, "order", created_at)
        values ('reused-old-section', ?, '旧単元', 99, 1)`).run(html);
      db.exec(`
        insert into lessons (id, section_id, title, type, "order", created_at, updated_at)
          values ('reused-old-lesson', 'reused-old-section', '旧本文', 'text', 0, 1, 1);
        insert into lesson_progress (id, tenant_id, user_id, lesson_id, completed, updated_at)
          values ('reused-old-progress', 'ses', 'upgrade-learner', 'reused-old-lesson', 1, 1);
        insert into submissions (id, tenant_id, student_id, lesson_id, stage_title, assignment_title, code, submitted_at)
          values ('reused-old-submission', 'ses', 'upgrade-learner', 'reused-old-lesson', 'HTML/CSS', '旧課題', '', 1);
      `);
      const retainedLesson = db
        .prepare(`select l.id from lessons l join sections s on s.id = l.section_id
        where s.stage_id = ? and s.id <> 'reused-old-section' limit 1`)
        .get(html) as { id: string };
      db.prepare(`insert into lesson_progress (id, tenant_id, user_id, lesson_id, completed, updated_at)
        values ('retained-progress', 'ses', 'upgrade-learner', ?, 1, 1)`).run(retainedLesson.id);

      // 同じ seed を再適用しても削除・履歴作成が増殖しない。
      db.exec(sql);
      const revisions = db.prepare("select count(*) as count from lesson_revisions").get();
      db.exec(sql);
      expect(db.prepare("select count(*) as count from lesson_revisions").get()).toEqual(revisions);
      expect(db.prepare("select id from stages where id = ?").get(retired)).toBeUndefined();
      for (const [table, column, value] of [
        ["sections", "id", "old-section"],
        ["sections", "id", "reused-old-section"],
        ["lessons", "id", "reused-old-lesson"],
        ["lesson_progress", "id", "reused-old-progress"],
        ["submissions", "id", "reused-old-submission"],
        ["lessons", "id", "old-lesson"],
        ["lesson_progress", "id", "old-progress"],
        ["lesson_materials", "id", "old-material"],
        ["lesson_revisions", "lesson_id", "old-lesson"],
        ["submissions", "id", "old-submission"],
        ["quizzes", "id", "old-quiz"],
        ["quiz_questions", "id", "old-question"],
        ["quiz_options", "id", "old-option"],
        ["quiz_attempts", "id", "old-attempt"],
        ["enrollments", "id", "enrollment-typescript-basics"],
        ["certificates", "id", "certificate-typescript-basics"],
      ] as const) {
        expect(
          db.prepare(`select * from ${table} where ${column} = ?`).get(value),
          table,
        ).toBeUndefined();
      }
      expect(
        db.prepare("select stage_id from announcements where id = 'old-announcement'").get(),
      ).toEqual({ stage_id: null });
      for (const slug of reused) {
        expect(db.prepare("select id from stages where slug = ?").get(slug)).toEqual({
          id: stageId(slug),
        });
        expect(
          db.prepare("select stage_id from enrollments where id = ?").get(`enrollment-${slug}`),
        ).toEqual({ stage_id: stageId(slug) });
        expect(
          db.prepare("select stage_id from certificates where id = ?").get(`certificate-${slug}`),
        ).toEqual({ stage_id: stageId(slug) });
      }
      expect(db.prepare("select title from stages where id = 'cms-stage'").get()).toEqual({
        title: "CMS 教材",
      });
      expect(db.prepare("select stage_id from sections where id = 'cms-section'").get()).toEqual({
        stage_id: "cms-stage",
      });
      expect(
        db.prepare("select lesson_id from lesson_progress where id = 'retained-progress'").get(),
      ).toEqual({ lesson_id: retainedLesson.id });
      expect(db.prepare("pragma foreign_key_check").all()).toEqual([]);
    } finally {
      db.close();
    }
  }, 60_000);
});

describe("export-seed-sql (sqlite, CONTENT_ONLY)", () => {
  const sql = exportSql(true);

  it("検証用 fixture を出さない", () => {
    expect(sql).not.toContain("seed-admin");
    expect(sql).not.toContain("seed-learner");
    expect(sql).not.toContain("seed-submission-pending-1");
    expect(sql).not.toContain("seed-enrollment-");
  });

  it("教材ステージは残す", () => {
    expect(sql).toContain("'salesforce-dev-basics'");
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
// quiz を生やさないガードが消えたら落ちるよう、@stella/content を差し替えて検証する。
vi.mock("@stella/content", async () => {
  const collidingLessonId = "l1";

  return {
    // @stella/content は「講座 = course」の語彙のまま (境界は export-seed-sql.ts)。
    buildContentManifest: () => ({
      courses: [
        {
          id: "salesforce-dev-basics",
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
          courseId: "salesforce-dev-basics",
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
