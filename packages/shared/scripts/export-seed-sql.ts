/**
 * fixtures を INSERT SQL に変換（D1 SQLite / 旧 Postgres 用）。
 *
 *   DIALECT=sqlite bun run packages/shared/scripts/export-seed-sql.ts   # D1
 *   bun run packages/shared/scripts/export-seed-sql.ts                  # Postgres (legacy)
 *
 * 教材ステージは upsert + prune（GitHub が正本）。旧デモ講座
 * (web-fundamentals 等) は安定 UUID で削除する。CMS で作った別 ID の
 * ステージのレッスンツリーは触らない。
 *
 * ここが course → stage の語彙の境界。教材リポジトリ (`packages/content`) は
 * 「講座 = course」のまま (`courses/<slug>/course.json`、`QuizSeed.courseId`、
 * PDF マニフェストの `courseSlug`) で、DB 側の表・列名は stage。したがって
 * manifest から読む側は course 語彙、SQL を書く側は stage 語彙で書く。
 * `stableUuid` の名前空間キー (`course:...`) だけは **改名しない** —
 * 変えると既存 D1 のステージ UUID が総入れ替えになり、受講登録・進捗・
 * 修了証の参照がまとめて切れるため。
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { buildContentManifest } from "@falcon/content";
import type { QuizQuestionSeed } from "@falcon/content";

import { TENANTS } from "../../../apps/web/src/data/seed-catalog.js";
import type { Stage, Lesson, Tenant } from "../../../apps/web/src/data/types.js";

import { findAssignment } from "../src/problems/index.js";
import { getEntryFile, getLanguage, getStaticAnalysisSettings } from "../src/assignment-helpers.js";
import { INTERVIEW_QUESTIONS } from "../src/interview/questions.js";
import { lessonIdRemapStatements } from "./lesson-id-remap.js";

const dialect = process.env.DIALECT === "sqlite" ? "sqlite" : "postgres";
const isSqlite = dialect === "sqlite";
/** 本番デプロイ用。検証用 seed-* ユーザー / 提出 / 登録を出さない。 */
const contentOnly = process.env.CONTENT_ONLY === "1";

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

function sqStr(s: string): string {
  return `'${esc(s)}'`;
}

function dollar(s: string): string {
  let tag = "d";
  while (s.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${s}$${tag}$`;
}

function strLit(s: string): string {
  return isSqlite ? sqStr(s) : dollar(s);
}

function json(v: unknown): string {
  return esc(JSON.stringify(v));
}

function nowExpr(): string {
  return isSqlite ? "cast(unixepoch('subsec') * 1000 as integer)" : "now()";
}

const tbl = (name: string) => (isSqlite ? name : `public.${name}`);

/** 名前空間キーから安定した UUID 文字列を作る（再 seed で ID がずれないようにする）。 */
function stableUuid(key: string): string {
  const h = createHash("sha1").update(key).digest();
  const bytes = Uint8Array.from(h.subarray(0, 16));
  const ver = bytes[6];
  const variant = bytes[8];
  if (ver === undefined || variant === undefined) {
    throw new Error("sha1 digest too short");
  }
  bytes[6] = (ver & 0x0f) | 0x50; // version 5-ish
  bytes[8] = (variant & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** レッスン ID はステージ内で一意。セクションをキーに含めると移動時に履歴が切れる。 */
function lessonUuid(tenantId: string, stageId: string, lessonId: string): string {
  return stableUuid(`lesson:${tenantId}:${stageId}:${lessonId}`);
}

/** 以前の section 込みキー。初回 seed で進捗を新 UUID へ付け替えるために残す。 */
function legacyLessonUuid(
  tenantId: string,
  stageId: string,
  sectionId: string,
  lessonId: string,
): string {
  return stableUuid(`lesson:${tenantId}:${stageId}:${sectionId}:${lessonId}`);
}

const stageIdMap = new Map<string, string>();
const sectionIdMap = new Map<string, string>();
const emittedAssignments = new Set<string>();

/** 教材ファイル（packages/content/courses/<slug>/modules）から組み立てたステージと確認クイズ。 */
const content = buildContentManifest();

const lines: string[] = ["-- seed from fixtures (generated)"];
if (!isSqlite) lines.push("begin;");

for (const t of TENANTS) {
  lines.push(
    `insert into ${isSqlite ? "" : "public."}tenants (id, name, subtitle, icon, active_count${isSqlite ? ", created_at, updated_at" : ""}) values ('${esc(t.id)}', '${esc(t.name)}', ${t.subtitle ? `'${esc(t.subtitle)}'` : "null"}, ${t.icon ? `'${esc(t.icon)}'` : "null"}, ${t.active}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set name = excluded.name, subtitle = excluded.subtitle, icon = excluded.icon, active_count = excluded.active_count;`,
  );
}

function emitStage(tenantId: Tenant["id"], stage: Stage) {
  const slug = esc(stage.id);
  // 名前空間キーは `course:` のまま (既存 D1 の UUID を維持するため — 冒頭の注記)。
  const stageUuid = stableUuid(`course:${tenantId}:${stage.id}`);
  stageIdMap.set(`${tenantId}:${stage.id}`, stageUuid);
  // スキルツリー用の 3 列 (Phase 1)。教材が正本なので、書いていない講座は null に戻す
  // (course.json から前提を外したら D1 のロックも外れる)。前提は **slug** の JSON 配列。
  const prerequisites =
    stage.prerequisites && stage.prerequisites.length > 0
      ? `'${json(stage.prerequisites)}'`
      : "null";
  const canDo = stage.canDo ? `'${esc(stage.canDo)}'` : "null";
  const theme = stage.theme ? `'${esc(stage.theme)}'` : "null";
  lines.push(
    `insert into ${isSqlite ? "" : "public."}stages (id, tenant_id, slug, title, category, color, thumbnail_path, duration_hours, description, instructor_name, status, prerequisites, can_do, theme${isSqlite ? ", created_at, updated_at" : ""}) values ('${stageUuid}', '${esc(tenantId)}', '${slug}', '${esc(stage.title)}', ${stage.category ? `'${esc(stage.category)}'` : "null"}, ${stage.color ? `'${esc(stage.color)}'` : "null"}, ${stage.thumbnailPath ? `'${esc(stage.thumbnailPath)}'` : "null"}, ${stage.duration ?? "null"}, ${stage.description ? `'${esc(stage.description)}'` : "null"}, ${stage.enrolledBy ? `'${esc(stage.enrolledBy)}'` : "null"}, 'published', ${prerequisites}, ${canDo}, ${theme}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, thumbnail_path = excluded.thumbnail_path, duration_hours = excluded.duration_hours, description = excluded.description, instructor_name = excluded.instructor_name, status = excluded.status, prerequisites = excluded.prerequisites, can_do = excluded.can_do, theme = excluded.theme, updated_at = ${nowExpr()};`,
  );

  // stage 行は slug で upsert し、セクション配下はステージ id がこの seed の安定
  // UUID と一致するときだけ upsert する（CMS 由来のランダム ID ステージは
  // メタデータだけ更新し、ツリーは触らない）。GitHub が正本なので、安定 UUID
  // ステージから消えた section / lesson は prune する。
  const sections = stage.sections ?? [];
  const sectionUuids: string[] = [];
  const lessonUuids: string[] = [];
  const lessonIdRemaps: { from: string; to: string }[] = [];
  const seenLessonIds = new Set<string>();
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionUuid = stableUuid(`section:${tenantId}:${stage.id}:${section.id}`);
    sectionIdMap.set(`${tenantId}:${stage.id}:${section.id}`, sectionUuid);
    sectionUuids.push(sectionUuid);
    lines.push(
      [
        `insert into ${tbl("sections")} (id, stage_id, title, "order"${isSqlite ? ", created_at" : ""})`,
        `select '${sectionUuid}', c.id, '${esc(section.title)}', ${i}${isSqlite ? `, ${nowExpr()}` : ""}`,
        `from ${tbl("stages")} c`,
        `where c.tenant_id = '${esc(tenantId)}' and c.slug = '${slug}' and c.id = '${stageUuid}'`,
        `on conflict (id) do update set title = excluded.title, "order" = excluded."order";`,
      ].join(" "),
    );
    for (let j = 0; j < section.lessons.length; j++) {
      const lesson = section.lessons[j];
      if (seenLessonIds.has(lesson.id)) {
        throw new Error(`duplicate lesson id "${lesson.id}" in stage ${stage.id}`);
      }
      seenLessonIds.add(lesson.id);
      const newLessonUuid = lessonUuid(tenantId, stage.id, lesson.id);
      const oldLessonUuid = legacyLessonUuid(tenantId, stage.id, section.id, lesson.id);
      lessonUuids.push(newLessonUuid);
      if (oldLessonUuid !== newLessonUuid) {
        lessonIdRemaps.push({ from: oldLessonUuid, to: newLessonUuid });
      }
      emitLesson(tenantId, stage.id, sectionUuid, j, lesson);
      // 確認クイズは教材ステージのレッスンにだけ紐づく。fixtures 側に同じ lesson.id が
      // 現れても quiz を生やさないよう、教材ステージかどうかで絞る（quizUuid は
      // stage / section を含まないため、絞らないと行が衝突する）。
      // content 側は course 語彙のまま (`courses` / `courseId`)。
      const quizSeed = content.courses.includes(stage)
        ? content.quizzes.find((q) => q.courseId === stage.id && q.lessonId === lesson.id)
        : undefined;
      if (quizSeed) emitQuiz(tenantId, stage.id, quizSeed);
      // 本文リビジョン。quiz レッスンは markdown を持たないので practice.md 全文を積む。
      const revisionSource = lesson.markdown ?? quizSeed?.sourceText;
      if (revisionSource !== undefined) {
        emitLessonRevision(
          tenantId,
          stage.id,
          lesson.id,
          revisionSource,
          revisionSource === lesson.markdown,
        );
      }
      if (lesson.assignmentId && !emittedAssignments.has(lesson.assignmentId)) {
        emittedAssignments.add(lesson.assignmentId);
        emitAssignment(tenantId, lesson.assignmentId);
      }
    }
  }

  emitLessonIdRemap(lessonIdRemaps);
  emitPrune(stageUuid, sectionUuids, lessonUuids);
}

function sqlIn(ids: string[]): string {
  return ids.map((id) => `'${id}'`).join(", ");
}

/** かつて seed していたデモ講座。再 seed で本番カタログから落とす。
 *  git-basics は同じ slug を教材講座(Git 入門研修)が再利用したため、ここには載せない。
 *  安定 UUID が同一なので、載せると upsert 直後に新講座ごと消えてしまう。 */
const RETIRED_DEMO_STAGES: ReadonlyArray<{ tenantId: string; slug: string }> = [
  { tenantId: "ses", slug: "web-fundamentals" },
  { tenantId: "ses", slug: "ciso-basic" },
  { tenantId: "ses", slug: "react-intro" },
  { tenantId: "coach", slug: "safety-1" },
  { tenantId: "coach", slug: "comm-1" },
  { tenantId: "coach", slug: "first-aid" },
];

function emitRetiredDemoStages() {
  for (const { tenantId, slug } of RETIRED_DEMO_STAGES) {
    // emitStage と同じ名前空間キー (`course:`) を使う。揃っていないと消せない。
    const stageUuid = stableUuid(`course:${tenantId}:${slug}`);
    const lessonsInStage = `select l.id from ${tbl("lessons")} l join ${tbl("sections")} s on s.id = l.section_id where s.stage_id = '${stageUuid}'`;
    const quizzesInStage = `select z.id from ${tbl("quizzes")} z where z.lesson_id in (${lessonsInStage})`;
    const questionsInStage = `select qq.id from ${tbl("quiz_questions")} qq where qq.quiz_id in (${quizzesInStage})`;
    lines.push(
      `delete from ${tbl("quiz_options")} where question_id in (${questionsInStage});`,
      `delete from ${tbl("quiz_attempts")} where quiz_id in (${quizzesInStage});`,
      `delete from ${tbl("quiz_questions")} where quiz_id in (${quizzesInStage});`,
      `delete from ${tbl("quizzes")} where lesson_id in (${lessonsInStage});`,
      `delete from ${tbl("lesson_materials")} where lesson_id in (${lessonsInStage});`,
      `delete from ${tbl("lesson_progress")} where lesson_id in (${lessonsInStage});`,
      `delete from ${tbl("submissions")} where lesson_id in (${lessonsInStage});`,
      `delete from ${tbl("lessons")} where section_id in (select id from ${tbl("sections")} where stage_id = '${stageUuid}');`,
      `delete from ${tbl("sections")} where stage_id = '${stageUuid}';`,
      `delete from ${tbl("enrollments")} where stage_id = '${stageUuid}';`,
      `delete from ${tbl("certificates")} where stage_id = '${stageUuid}';`,
      `update ${tbl("announcements")} set stage_id = null where stage_id = '${stageUuid}';`,
      // slug 一致だけでは消さない。CMS が同じ slug で別 ID を持つステージを残す。
      `delete from ${tbl("stages")} where id = '${stageUuid}';`,
    );
  }
}

/** 安定 UUID ステージから、GitHub に無い section / lesson を落とす。
 *  stage_id が安定 UUID と一致しない CMS ステージは触らない。 */
function emitPrune(stageUuid: string, sectionUuids: string[], lessonUuids: string[]) {
  if (sectionUuids.length === 0) return;
  lines.push(
    lessonUuids.length > 0
      ? `delete from ${tbl("lessons")} where section_id in (select id from ${tbl("sections")} where stage_id = '${stageUuid}') and id not in (${sqlIn(lessonUuids)});`
      : `delete from ${tbl("lessons")} where section_id in (select id from ${tbl("sections")} where stage_id = '${stageUuid}');`,
    `delete from ${tbl("sections")} where stage_id = '${stageUuid}' and id not in (${sqlIn(sectionUuids)});`,
  );
}

/** 旧 section 込み UUID を新 UUID へ付け替え、prune で進捗・受験が消えないようにする。
 *  新旧両方ある受講者は UNIQUE を踏むので、先に新 ID 行へ寄せてから旧行を消す。 */
function emitLessonIdRemap(pairs: { from: string; to: string }[]) {
  lines.push(...lessonIdRemapStatements(pairs, tbl));
}

/**
 * 教材本文のリビジョン履歴 (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 * 直前リビジョンとハッシュが違うときだけ 1 行積む — 同一内容の再 seed では増えない。
 * D1 専用テーブルなので legacy Postgres には出さない。
 *
 * `guardLessonMarkdown` (slides / doc — source が lessons.markdown と同じ文字列のとき):
 * seed は CMS のレッスン単位ロック (cms.ts の lesson-markdown:*) を取らないため、
 * デプロイ中の CMS 編集と競れる。lessons 行が **まだこの seed の本文を保持している
 * ときだけ** リビジョンを積むことで、「本文は CMS の B なのに最新リビジョンは seed の
 * A」という取り残しを防ぐ (CMS が勝った場合はこの insert が no-op になり、CMS 側の
 * リビジョンが最新のまま)。残る極小の交錯パターンでも、次の seed が本文を正本へ
 * 戻すと同時にリビジョンも追い付くので恒久的な食い違いにはならない。
 * 本文リテラルが 2 回入るため文が大きくなるが、最大教材 (~31KB) でも seed-d1.ts の
 * 1 文 100KB 制限に収まる。超えたら chunkStatements が throw して気づける。
 */
function emitLessonRevision(
  tenantId: Tenant["id"],
  stageId: string,
  lessonId: string,
  source: string,
  guardLessonMarkdown: boolean,
) {
  if (!isSqlite) return;
  const id = lessonUuid(tenantId, stageId, lessonId);
  const hash = createHash("sha256").update(source).digest("hex");
  const latestHash = `select r.source_hash from lesson_revisions r where r.lesson_id = '${id}' order by r.revision desc limit 1`;
  // migration 0031 の番兵行 (SHA-256 を SQL で計算できないための仮基準) は、seed が
  // 正本のレッスンでは実ハッシュ入りの行に入れ替える。先に消すことで下の insert が
  // revision 1 から振り直す。2 回目以降の seed では番兵行は無いので no-op。
  lines.push(
    `delete from lesson_revisions where lesson_id = '${id}' and source_hash = 'pre-versioning';`,
  );
  const lessonGuard = guardLessonMarkdown
    ? `where exists (select 1 from lessons l where l.id = '${id}' and l.markdown = '${esc(source)}')`
    : `where exists (select 1 from lessons l where l.id = '${id}')`;
  lines.push(
    [
      "insert into lesson_revisions (lesson_id, revision, source_hash, markdown, source, created_by, created_at)",
      `select '${id}', coalesce((select max(r.revision) from lesson_revisions r where r.lesson_id = '${id}'), 0) + 1, '${hash}', '${esc(source)}', 'seed', null, ${nowExpr()}`,
      lessonGuard,
      `and coalesce((${latestHash}), '') <> '${hash}';`,
    ].join(" "),
  );
}

function emitLesson(
  tenantId: Tenant["id"],
  stageId: string,
  sectionUuid: string,
  lessonOrder: number,
  lesson: Lesson,
) {
  const id = lessonUuid(tenantId, stageId, lesson.id);
  lines.push(
    [
      `insert into ${tbl("lessons")} (id, section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec${isSqlite ? ", created_at, updated_at" : ""})`,
      `select '${id}', s.id, '${esc(lesson.title)}', '${lesson.type}', ${lessonOrder}, ${lesson.duration ? `'${esc(lesson.duration)}'` : "null"}, ${lesson.videoPath ? `'${esc(lesson.videoPath)}'` : "null"}, ${lesson.pdfPath ? `'${esc(lesson.pdfPath)}'` : "null"}, ${lesson.markdown ? `'${esc(lesson.markdown)}'` : "null"}, ${lesson.assignmentId ? `'${esc(lesson.assignmentId)}'` : "null"}, ${lesson.totalPages ?? "null"}, ${lesson.totalSec ?? "null"}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}`,
      `from ${tbl("sections")} s`,
      `where s.id = '${sectionUuid}'`,
      `on conflict (id) do update set section_id = excluded.section_id, title = excluded.title, type = excluded.type, "order" = excluded."order", duration_label = excluded.duration_label, video_path = excluded.video_path, pdf_path = excluded.pdf_path, markdown = excluded.markdown, assignment_id = excluded.assignment_id, total_pages = excluded.total_pages, total_sec = excluded.total_sec${isSqlite ? `, updated_at = ${nowExpr()}` : ""};`,
    ].join(" "),
  );
}

function emitAssignment(tenantId: Tenant["id"], assignmentId: string) {
  const a = findAssignment(assignmentId);
  if (!a) {
    lines.push(`-- assignment ${assignmentId} not in shared — skipped`);
    return;
  }
  const settings = getStaticAnalysisSettings(a);
  const jsonCast = isSqlite ? "" : "::jsonb";
  lines.push(
    `insert into ${isSqlite ? "" : "public."}assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call${isSqlite ? ", created_at, updated_at" : ""}) values ('${esc(a.id)}', '${esc(tenantId)}', '${esc(a.stage)}', '${esc(a.chapterId)}', '${esc(a.title)}', ${strLit(a.description)}, '${getLanguage(a)}', '${a.testKind}', '${json(a.starterFiles)}'${jsonCast}, '${esc(getEntryFile(a))}', ${a.entryPoints ? `'${json(a.entryPoints)}'${jsonCast}` : "null"}, '${json(a.tests)}'${jsonCast}, ${a.sqlSeed ? strLit(a.sqlSeed) : "null"}, ${a.lintPreset ? `'${esc(a.lintPreset)}'` : "null"}, '${json({ eslint: { rules: settings.eslintRules }, ast: settings.ast })}'${jsonCast}, ${a.mutation ? `'${json(a.mutation)}'${jsonCast}` : "null"}, ${a.demoCall ? `'${esc(a.demoCall)}'` : "null"}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;`,
  );
}

/**
 * quiz / quiz_questions / quiz_options を emit する。
 * quiz UUID は stage + lesson.id（section 非依存）。講座を増やしても衝突しない。
 * 設問・選択肢は差分マージせず delete → insert（教材ファイルが唯一の正本）。
 * 旧 UUID (`quiz:${tenant}:${lessonId}`) の受験履歴は新 UUID へ付け替えてから消す。
 */
function emitQuiz(
  tenantId: Tenant["id"],
  stageId: string,
  quiz: { lessonId: string; passScore: number; questions: QuizQuestionSeed[] },
) {
  const id = lessonUuid(tenantId, stageId, quiz.lessonId);
  const quizUuid = stableUuid(`quiz:${tenantId}:${stageId}:${quiz.lessonId}`);
  const legacyQuizUuid = stableUuid(`quiz:${tenantId}:${quiz.lessonId}`);

  lines.push(
    [
      `insert into ${tbl("quizzes")} (id, lesson_id, pass_score, time_limit_sec, max_attempts${isSqlite ? ", created_at, updated_at" : ""})`,
      `select '${quizUuid}', l.id, ${quiz.passScore}, null, null${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}`,
      `from ${tbl("lessons")} l`,
      `where l.id = '${id}'`,
      `on conflict (id) do update set lesson_id = excluded.lesson_id, pass_score = excluded.pass_score, updated_at = ${nowExpr()};`,
    ].join(" "),
  );
  if (legacyQuizUuid !== quizUuid) {
    lines.push(
      `update ${tbl("quiz_attempts")} set quiz_id = '${quizUuid}' where quiz_id = '${legacyQuizUuid}';`,
    );
  }
  lines.push(
    `delete from ${tbl("quiz_questions")} where quiz_id in (select id from ${tbl("quizzes")} where lesson_id = '${id}' and id != '${quizUuid}');`,
    `delete from ${tbl("quizzes")} where lesson_id = '${id}' and id != '${quizUuid}';`,
    `delete from ${tbl("quiz_questions")} where quiz_id = '${quizUuid}';`,
  );

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const qUuid = stableUuid(`quiz-q:${tenantId}:${stageId}:${quiz.lessonId}:${i}`);
    lines.push(
      [
        `insert into ${tbl("quiz_questions")} (id, quiz_id, kind, prompt, explanation, points, "order"${isSqlite ? ", created_at, updated_at" : ""})`,
        `select '${qUuid}', '${quizUuid}', 'single', ${strLit(q.prompt)}, ${strLit(q.explanation)}, 1, ${i}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}`,
        `where exists (select 1 from ${tbl("quizzes")} z where z.id = '${quizUuid}');`,
      ].join(" "),
    );
    for (let j = 0; j < q.options.length; j++) {
      const o = q.options[j];
      const oUuid = stableUuid(`quiz-o:${tenantId}:${stageId}:${quiz.lessonId}:${i}:${j}`);
      lines.push(
        [
          `insert into ${tbl("quiz_options")} (id, question_id, label, is_correct, "order")`,
          `select '${oUuid}', '${qUuid}', ${strLit(o.label)}, ${o.isCorrect ? (isSqlite ? "1" : "true") : isSqlite ? "0" : "false"}, ${j}`,
          `where exists (select 1 from ${tbl("quiz_questions")} qq where qq.id = '${qUuid}');`,
        ].join(" "),
      );
    }
  }
}

/**
 * 面談対策の想定質問バンク (upsert + prune)。 questions.json が正本。
 *
 * ただし **admin / 営業が画面から直した行は上書きしない** (Issue #237)。 deploy は
 * main への push ごとに seed を流すため、 素の upsert だと現場の修正がその都度
 * questions.json の文面へ巻き戻ってしまう。 `edited_at` が入っている行は人の手が
 * 入った行なので、 do update の WHERE で弾く。 questions.json 側で直したいときは
 * 画面の「正本の管理に戻す」で解除を予約してから seed する。 解除はその場では
 * 本文を戻さない (API は questions.json を持たない) ので、 予約 → この seed が
 * 本文を書き戻すのと同時に編集印も落とす、 という順で辻褄を合わせている。
 *
 * `deep1`〜`deep3` は深掘り廃止 (一問一答化) に伴い常に null を書く。 列そのものは
 * まだ落とさない —— deploy は migrate → deploy:api → seed の順なので、 同じ deploy で
 * 列を落とすと旧 Worker が消えた列を select する窓ができる。 この deploy で誰も
 * 読まなくなってから、 次の deploy で drop column する (2 段階の列削除)。
 */
function emitInterviewQuestions(tenantId: string) {
  const ids: string[] = [];
  const bool = (v: boolean) => (isSqlite ? (v ? "1" : "0") : v ? "true" : "false");
  const opt = (v: string | null) => (v ? strLit(v) : "null");
  for (const q of INTERVIEW_QUESTIONS) {
    const cats = strLit(JSON.stringify(q.categories));
    const id = stableUuid(`interview-q:${tenantId}:${q.no}`);
    ids.push(id);
    lines.push(
      `insert into ${tbl("interview_questions")} (id, tenant_id, no, categories, subcategory, freq, question, time, keywords, intent, answer_template, deep1, deep2, deep3, ng, criteria, is_reverse${isSqlite ? ", created_at, updated_at" : ""}) values ('${id}', '${esc(tenantId)}', ${q.no}, ${cats}, ${strLit(q.subcategory)}, '${q.freq}', ${strLit(q.question)}, ${opt(q.time)}, ${opt(q.keywords)}, ${opt(q.intent)}, ${opt(q.answer_template)}, null, null, null, ${opt(q.ng)}, ${opt(q.criteria)}, ${bool(q.is_reverse)}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set categories = excluded.categories, subcategory = excluded.subcategory, freq = excluded.freq, question = excluded.question, time = excluded.time, keywords = excluded.keywords, intent = excluded.intent, answer_template = excluded.answer_template, deep1 = null, deep2 = null, deep3 = null, ng = excluded.ng, criteria = excluded.criteria, is_reverse = excluded.is_reverse, updated_at = ${nowExpr()}, edited_at = null, edited_by = null, release_requested_at = null where interview_questions.edited_at is null or interview_questions.release_requested_at is not null;`,
    );
  }
  lines.push(
    `delete from ${tbl("interview_questions")} where tenant_id = '${esc(tenantId)}' and id not in (${sqlIn(ids)});`,
  );
}

/** upload-pdfs.ts が出すマニフェスト 1 行ぶん。教材側の語彙なので `courseSlug`。 */
interface PdfManifestEntry {
  tenantId: string;
  courseSlug: string;
  lessonId: string;
  hash: string;
  key: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * 自動生成 PDF (配布資料) の登録
 * (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 *
 * `PDF_MANIFEST` に upload-pdfs.ts のマニフェストを渡されたときだけ出す (deploy が
 * R2 への put を終えてから seed を流す — D1 が存在しないオブジェクトを指す時間を
 * 作らない、サムネイルと同じ順序)。auto の行はレッスンにつき 1 行で常に最新版を
 * 指し、版履歴は lesson_material_versions に積む。ハッシュが前回と同じなら版は
 * 増えない (冪等)。旧版の R2 オブジェクトは消さない (版の保持は仕様)。
 */
function emitPdfMaterials() {
  const manifestPath = process.env.PDF_MANIFEST;
  if (!manifestPath || !isSqlite) return;
  const entries = JSON.parse(readFileSync(manifestPath, "utf8")) as PdfManifestEntry[];
  for (const e of entries) {
    if (typeof e.sizeBytes !== "number") {
      throw new Error(`pdf manifest: sizeBytes がありません: ${e.key}`);
    }
    const lessonId = lessonUuid(e.tenantId, e.courseSlug, e.lessonId);
    const materialId = stableUuid(
      `lesson-material-pdf:${e.tenantId}:${e.courseSlug}:${e.lessonId}`,
    );
    lines.push(
      [
        "insert into lesson_materials (id, lesson_id, path, file_name, size_bytes, mime_type, source, created_by, created_at)",
        `select '${materialId}', l.id, '${esc(e.key)}', ${strLit(e.fileName)}, ${e.sizeBytes}, 'application/pdf', 'auto', null, ${nowExpr()}`,
        `from lessons l where l.id = '${lessonId}'`,
        "on conflict (id) do update set path = excluded.path, file_name = excluded.file_name, size_bytes = excluded.size_bytes, mime_type = excluded.mime_type, source = excluded.source;",
      ].join(" "),
    );
    lines.push(
      [
        "insert into lesson_material_versions (material_id, version, path, source_hash, lesson_revision, size_bytes, created_at)",
        `select '${materialId}', coalesce((select max(v.version) from lesson_material_versions v where v.material_id = '${materialId}'), 0) + 1, '${esc(e.key)}', '${e.hash}', (select max(r.revision) from lesson_revisions r where r.lesson_id = '${lessonId}'), ${e.sizeBytes}, ${nowExpr()}`,
        `where exists (select 1 from lesson_materials m where m.id = '${materialId}')`,
        `and coalesce((select v2.source_hash from lesson_material_versions v2 where v2.material_id = '${materialId}' order by v2.version desc limit 1), '') <> '${e.hash}';`,
      ].join(" "),
    );
  }
}

for (const c of content.courses) emitStage("ses", c);
emitRetiredDemoStages();
emitPdfMaterials();

emitInterviewQuestions("ses");

lines.push(
  `delete from ${tbl("lesson_progress")} where lesson_id not in (select id from ${tbl("lessons")});`,
);

if (!contentOnly) {
  // Minimal verification scenario (stable IDs for queue / list smoke checks)
  const SEED_ADMIN = "seed-admin";
  const SEED_INSTRUCTOR = "seed-instructor";
  const SEED_LEARNER = "seed-learner";
  /**
   * 受講登録を **1 件も持たない** 受講者。
   *
   * Phase 3b で登録の入口が自己開始だけになったので、「まだ何も始めていない人」に
   * 何が見えるか (ホームのプレースメント案内、スキルマップの `next_stage_ids`、
   * 受講状況の空表示) が要検証の主要な状態になった。 `seed-learner` は全ステージに
   * 登録済みで、 その画面には二度と戻れない — 手で登録を消してから試すと seed が
   * 書き戻し、 検証のたびに手順が増える。 専用の profile を 1 人置く方が安い。
   */
  const SEED_LEARNER2 = "seed-learner2";
  const SEED_SALES = "seed-sales";
  const SEED_ENROLLMENT = "seed-enrollment-learner-typescript-basics";
  const SEED_SUBMISSION = "seed-submission-pending-1";
  const tsStage = content.courses.find((c) => c.id === "typescript-basics");
  const firstLesson = tsStage?.sections?.[0]?.lessons?.[0];
  const tsLessonId =
    tsStage && firstLesson
      ? lessonUuid("ses", tsStage.id, firstLesson.id)
      : lessonUuid("ses", "typescript-basics", "0-1-1");
  emitAssignment("ses", "S0-Ch00-01-print-hello");

  for (const p of [
    {
      id: SEED_ADMIN,
      role: "admin",
      name: "Seed Admin",
      initials: "SA",
      email: "seed-admin@example.local",
    },
    {
      id: SEED_INSTRUCTOR,
      role: "instructor",
      name: "Seed Instructor",
      initials: "SI",
      email: "seed-instructor@example.local",
    },
    {
      id: SEED_LEARNER,
      role: "student",
      name: "Seed Learner",
      initials: "SL",
      email: "seed-learner@example.local",
    },
    {
      // 受講登録なしの受講者 (下の enrollment ループには入れない)。
      id: SEED_LEARNER2,
      role: "student",
      name: "Seed Learner 2",
      initials: "S2",
      email: "seed-learner2@example.local",
    },
    {
      id: SEED_SALES,
      role: "sales",
      name: "Seed Sales",
      initials: "SS",
      email: "seed-sales@example.local",
    },
  ]) {
    lines.push(
      isSqlite
        ? `insert into profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('${p.id}', 'ses', '${p.role}', '${esc(p.name)}', '${p.initials}', '${p.email}', 0, ${nowExpr()}) on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, initials = excluded.initials, email = excluded.email;`
        : `insert into public.profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('${p.id}', 'ses', '${p.role}', '${esc(p.name)}', '${p.initials}', '${p.email}', false, ${nowExpr()}) on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, initials = excluded.initials, email = excluded.email;`,
    );
  }

  // 教材ステージに `seed-learner` を登録しておく。 登録が無いと出題 API
  // (`/api/quiz/for-lesson`) も資料もアクセス不可になり、 seed だけでは検証できない。
  //
  // 形は **自己開始の履歴** に揃える (Phase 3b): `assigned_by` は受講者自身、
  // `required` は 0、 期限なし。 割当は退役したので `assigned_by='seed-instructor'` /
  // `required=1` のままだと、 seed が 「もう作れないはずの割当」 を毎回作り直すことに
  // なり、 受講状況の画面にも 「必須」 バッジという実在しない運用が並ぶ。
  // 登録が 0 件の状態を見たいときは `seed-learner2` を使う。
  //
  // 既存行にも当て直す (`do update`) — 割当時代に seed が入れた行が残っている DB を
  // 流し直したときに、 新しい形へ収束させるため。 2 度流しても同じ 1 行のまま。
  for (const [id, slug] of [
    ...content.courses.map((c) =>
      c.id === "typescript-basics"
        ? ([SEED_ENROLLMENT, c.id] as const)
        : ([`seed-enrollment-learner-${c.id}`, c.id] as const),
    ),
  ] as const) {
    lines.push(
      [
        `insert into ${tbl("enrollments")} (id, tenant_id, user_id, stage_id, assigned_by, due_at, required, status, enrolled_at, completed_at)`,
        `select '${id}', 'ses', '${SEED_LEARNER}', c.id, '${SEED_LEARNER}', null, ${isSqlite ? "0" : "false"}, 'active', ${nowExpr()}, null`,
        `from ${tbl("stages")} c`,
        `where c.tenant_id = 'ses' and c.slug = '${esc(slug)}'`,
        `on conflict (user_id, stage_id) do update set status = excluded.status, required = excluded.required, assigned_by = excluded.assigned_by, due_at = excluded.due_at;`,
      ].join(" "),
    );
  }

  lines.push(
    `insert into ${tbl("submissions")} (id, tenant_id, student_id, lesson_id, assignment_id, stage_title, section_title, assignment_title, code, status, priority, attempt, ai_ready, ai_suggestions, rubric, review_notes, verdict, submitted_at, reviewed_at, reviewer_id) values ('${SEED_SUBMISSION}', 'ses', '${SEED_LEARNER}', '${tsLessonId}', 'S0-Ch00-01-print-hello', 'TypeScript 入門研修', ${strLit(tsStage?.sections?.[0]?.title ?? "M0. オリエンテーション")}, ${strLit("console.log で文字を出す")}, ${strLit("console.log('hello');\n")}, 'pending', 'normal', 1, ${isSqlite ? "0" : "false"}, '[]', '[]', '', null, ${nowExpr()}, null, null) on conflict (id) do update set code = excluded.code, status = excluded.status, student_id = excluded.student_id;`,
  );
}

if (!isSqlite) lines.push("commit;");
console.log(lines.join("\n"));
