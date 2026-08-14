/**
 * fixtures を INSERT SQL に変換（D1 SQLite / 旧 Postgres 用）。
 *
 *   DIALECT=sqlite bun run packages/shared/scripts/export-seed-sql.ts   # D1
 *   bun run packages/shared/scripts/export-seed-sql.ts                  # Postgres (legacy)
 *
 * 教材コースは upsert + prune（GitHub が正本）。コース id が安定 UUID と
 * 一致しない CMS コースのレッスンツリーは触らない。
 */

import { createHash } from "node:crypto";

import { buildContentManifest } from "@falcon/content";
import type { QuizQuestionSeed } from "@falcon/content";

import {
  COACH_COURSES,
  SES_COURSES,
  TENANTS,
} from "../../../apps/web/src/data/seed-catalog.js";
import type { Course, Lesson, Tenant } from "../../../apps/web/src/data/types.js";

import { findAssignment } from "../src/problems/index.js";
import {
  getEntryFile,
  getLanguage,
  getStaticAnalysisSettings,
} from "../src/assignment-helpers.js";
import { INTERVIEW_QUESTIONS } from "../src/interview/questions.js";

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
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5-ish
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** レッスン ID はコース内で一意。セクションをキーに含めると移動時に履歴が切れる。 */
function lessonUuid(tenantId: string, courseId: string, lessonId: string): string {
  return stableUuid(`lesson:${tenantId}:${courseId}:${lessonId}`);
}

/** 以前の section 込みキー。初回 seed で進捗を新 UUID へ付け替えるために残す。 */
function legacyLessonUuid(
  tenantId: string,
  courseId: string,
  sectionId: string,
  lessonId: string,
): string {
  return stableUuid(`lesson:${tenantId}:${courseId}:${sectionId}:${lessonId}`);
}

const courseIdMap = new Map<string, string>();
const sectionIdMap = new Map<string, string>();
const emittedAssignments = new Set<string>();

/** 教材ファイル（packages/content/modules）から組み立てたコースと確認クイズ。 */
const content = buildContentManifest();

const lines: string[] = ["-- seed from fixtures (generated)"];
if (!isSqlite) lines.push("begin;");

for (const t of TENANTS) {
  lines.push(
    `insert into ${isSqlite ? "" : "public."}tenants (id, name, subtitle, icon, active_count${isSqlite ? ", created_at, updated_at" : ""}) values ('${esc(t.id)}', '${esc(t.name)}', ${t.subtitle ? `'${esc(t.subtitle)}'` : "null"}, ${t.icon ? `'${esc(t.icon)}'` : "null"}, ${t.active}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set name = excluded.name, subtitle = excluded.subtitle, icon = excluded.icon, active_count = excluded.active_count;`,
  );
}

function emitCourse(tenantId: Tenant["id"], course: Course) {
  const slug = esc(course.id);
  const courseUuid = stableUuid(`course:${tenantId}:${course.id}`);
  courseIdMap.set(`${tenantId}:${course.id}`, courseUuid);
  lines.push(
    `insert into ${isSqlite ? "" : "public."}courses (id, tenant_id, slug, title, category, color, duration_hours, description, instructor_name, status${isSqlite ? ", created_at, updated_at" : ""}) values ('${courseUuid}', '${esc(tenantId)}', '${slug}', '${esc(course.title)}', ${course.category ? `'${esc(course.category)}'` : "null"}, ${course.color ? `'${esc(course.color)}'` : "null"}, ${course.duration ?? "null"}, ${course.description ? `'${esc(course.description)}'` : "null"}, ${course.enrolledBy ? `'${esc(course.enrolledBy)}'` : "null"}, 'published'${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, instructor_name = excluded.instructor_name, status = excluded.status, updated_at = ${nowExpr()};`,
  );

  // course 行は slug で upsert し、セクション配下はコース id がこの seed の安定
  // UUID と一致するときだけ upsert する（CMS 由来のランダム ID コースは
  // メタデータだけ更新し、ツリーは触らない）。GitHub が正本なので、安定 UUID
  // コースから消えた section / lesson は prune する。
  const sections = course.sections ?? [];
  const sectionUuids: string[] = [];
  const lessonUuids: string[] = [];
  const lessonIdRemaps: { from: string; to: string }[] = [];
  const seenLessonIds = new Set<string>();
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionUuid = stableUuid(`section:${tenantId}:${course.id}:${section.id}`);
    sectionIdMap.set(`${tenantId}:${course.id}:${section.id}`, sectionUuid);
    sectionUuids.push(sectionUuid);
    lines.push(
      [
        `insert into ${tbl("sections")} (id, course_id, title, "order"${isSqlite ? ", created_at" : ""})`,
        `select '${sectionUuid}', c.id, '${esc(section.title)}', ${i}${isSqlite ? `, ${nowExpr()}` : ""}`,
        `from ${tbl("courses")} c`,
        `where c.tenant_id = '${esc(tenantId)}' and c.slug = '${slug}' and c.id = '${courseUuid}'`,
        `on conflict (id) do update set title = excluded.title, "order" = excluded."order";`,
      ].join(" "),
    );
    for (let j = 0; j < section.lessons.length; j++) {
      const lesson = section.lessons[j];
      if (seenLessonIds.has(lesson.id)) {
        throw new Error(`duplicate lesson id "${lesson.id}" in course ${course.id}`);
      }
      seenLessonIds.add(lesson.id);
      const newLessonUuid = lessonUuid(tenantId, course.id, lesson.id);
      const oldLessonUuid = legacyLessonUuid(tenantId, course.id, section.id, lesson.id);
      lessonUuids.push(newLessonUuid);
      if (oldLessonUuid !== newLessonUuid) {
        lessonIdRemaps.push({ from: oldLessonUuid, to: newLessonUuid });
      }
      emitLesson(tenantId, course.id, sectionUuid, j, lesson);
      // 確認クイズは教材コースのレッスンにだけ紐づく。fixtures 側に同じ lesson.id が
      // 現れても quiz を生やさないよう、教材コースかどうかで絞る（quizUuid は
      // course / section を含まないため、絞らないと行が衝突する）。
      const quizSeed = content.courses.includes(course)
        ? content.quizzes.find((q) => q.lessonId === lesson.id)
        : undefined;
      if (quizSeed) emitQuiz(tenantId, course.id, quizSeed);
      if (lesson.assignmentId && !emittedAssignments.has(lesson.assignmentId)) {
        emittedAssignments.add(lesson.assignmentId);
        emitAssignment(tenantId, lesson.assignmentId);
      }
    }
  }

  emitLessonIdRemap(lessonIdRemaps);
  emitPrune(courseUuid, sectionUuids, lessonUuids);
}

function sqlIn(ids: string[]): string {
  return ids.map((id) => `'${id}'`).join(", ");
}

/** 安定 UUID コースから、GitHub に無い section / lesson を落とす。
 *  seed にセクションが無いカタログ stub と、course_id が安定 UUID と一致しない
 *  CMS コースは触らない。 */
function emitPrune(courseUuid: string, sectionUuids: string[], lessonUuids: string[]) {
  if (sectionUuids.length === 0) return;
  lines.push(
    lessonUuids.length > 0
      ? `delete from ${tbl("lessons")} where section_id in (select id from ${tbl("sections")} where course_id = '${courseUuid}') and id not in (${sqlIn(lessonUuids)});`
      : `delete from ${tbl("lessons")} where section_id in (select id from ${tbl("sections")} where course_id = '${courseUuid}');`,
    `delete from ${tbl("sections")} where course_id = '${courseUuid}' and id not in (${sqlIn(sectionUuids)});`,
  );
}

/** 旧 section 込み UUID を新 UUID へ付け替え、prune で進捗・受験が消えないようにする。 */
function emitLessonIdRemap(pairs: { from: string; to: string }[]) {
  if (pairs.length === 0) return;
  const cases = pairs.map((p) => `when '${p.from}' then '${p.to}'`).join(" ");
  const fromList = sqlIn(pairs.map((p) => p.from));
  const retarget = (table: string, col: string) =>
    `update ${tbl(table)} set ${col} = case ${col} ${cases} end where ${col} in (${fromList});`;
  lines.push(
    retarget("lesson_progress", "lesson_id"),
    retarget("submissions", "lesson_id"),
    retarget("lesson_materials", "lesson_id"),
    retarget("quizzes", "lesson_id"),
  );
}

function emitLesson(
  tenantId: Tenant["id"],
  courseId: string,
  sectionUuid: string,
  lessonOrder: number,
  lesson: Lesson,
) {
  const id = lessonUuid(tenantId, courseId, lesson.id);
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
 * quiz UUID は lesson.id のみ（section 非依存）。seed を何度流しても同じ行になる。
 * 設問・選択肢は差分マージせず delete → insert（教材ファイルが唯一の正本）。
 */
function emitQuiz(
  tenantId: Tenant["id"],
  courseId: string,
  quiz: { lessonId: string; passScore: number; questions: QuizQuestionSeed[] },
) {
  const id = lessonUuid(tenantId, courseId, quiz.lessonId);
  const quizUuid = stableUuid(`quiz:${tenantId}:${quiz.lessonId}`);

  lines.push(
    [
      `insert into ${tbl("quizzes")} (id, lesson_id, pass_score, time_limit_sec, shuffle_questions, shuffle_options, max_attempts${isSqlite ? ", created_at, updated_at" : ""})`,
      `select '${quizUuid}', l.id, ${quiz.passScore}, null, ${isSqlite ? "0" : "false"}, ${isSqlite ? "0" : "false"}, null${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}`,
      `from ${tbl("lessons")} l`,
      `where l.id = '${id}'`,
      `on conflict (id) do update set lesson_id = excluded.lesson_id, pass_score = excluded.pass_score, updated_at = ${nowExpr()};`,
    ].join(" "),
    `delete from ${tbl("quiz_questions")} where quiz_id = '${quizUuid}';`,
  );

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const qUuid = stableUuid(`quiz-q:${tenantId}:${quiz.lessonId}:${i}`);
    lines.push(
      [
        `insert into ${tbl("quiz_questions")} (id, quiz_id, kind, prompt, explanation, points, "order"${isSqlite ? ", created_at, updated_at" : ""})`,
        `select '${qUuid}', '${quizUuid}', 'single', ${strLit(q.prompt)}, ${strLit(q.explanation)}, 1, ${i}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}`,
        `where exists (select 1 from ${tbl("quizzes")} z where z.id = '${quizUuid}');`,
      ].join(" "),
    );
    for (let j = 0; j < q.options.length; j++) {
      const o = q.options[j];
      const oUuid = stableUuid(`quiz-o:${tenantId}:${quiz.lessonId}:${i}:${j}`);
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

/** 面談対策の想定質問バンク (upsert + prune)。 questions.json が正本。 */
function emitInterviewQuestions(tenantId: string) {
  const ids: string[] = [];
  const bool = (v: boolean) => (isSqlite ? (v ? "1" : "0") : v ? "true" : "false");
  const opt = (v: string | null) => (v ? strLit(v) : "null");
  for (const q of INTERVIEW_QUESTIONS) {
    const id = stableUuid(`interview-q:${tenantId}:${q.no}`);
    ids.push(id);
    lines.push(
      `insert into ${tbl("interview_questions")} (id, tenant_id, no, category, subcategory, freq, question, time, keywords, intent, answer_template, deep1, deep2, deep3, ng, criteria, is_reverse${isSqlite ? ", created_at, updated_at" : ""}) values ('${id}', '${esc(tenantId)}', ${q.no}, ${strLit(q.category)}, ${strLit(q.subcategory)}, '${q.freq}', ${strLit(q.question)}, ${opt(q.time)}, ${opt(q.keywords)}, ${opt(q.intent)}, ${opt(q.answer_template)}, ${opt(q.deep1)}, ${opt(q.deep2)}, ${opt(q.deep3)}, ${opt(q.ng)}, ${opt(q.criteria)}, ${bool(q.is_reverse)}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set category = excluded.category, subcategory = excluded.subcategory, freq = excluded.freq, question = excluded.question, time = excluded.time, keywords = excluded.keywords, intent = excluded.intent, answer_template = excluded.answer_template, deep1 = excluded.deep1, deep2 = excluded.deep2, deep3 = excluded.deep3, ng = excluded.ng, criteria = excluded.criteria, is_reverse = excluded.is_reverse, updated_at = ${nowExpr()};`,
    );
  }
  lines.push(
    `delete from ${tbl("interview_questions")} where tenant_id = '${esc(tenantId)}' and id not in (${sqlIn(ids)});`,
  );
}

for (const c of [...SES_COURSES, ...content.courses]) emitCourse("ses", c);
for (const c of COACH_COURSES) emitCourse("coach", c);

emitInterviewQuestions("ses");

lines.push(
  `delete from ${tbl("lesson_progress")} where lesson_id not in (select id from ${tbl("lessons")});`,
);

if (!contentOnly) {
  // Minimal verification scenario (stable IDs for queue / list smoke checks)
  const SEED_ADMIN = "seed-admin";
  const SEED_INSTRUCTOR = "seed-instructor";
  const SEED_LEARNER = "seed-learner";
  const SEED_ENROLLMENT = "seed-enrollment-learner-web-fundamentals";
  const SEED_SUBMISSION = "seed-submission-pending-1";
  const webFundLessonId = lessonUuid("ses", "web-fundamentals", "l11a");

  for (const p of [
    { id: SEED_ADMIN, role: "admin", name: "Seed Admin", initials: "SA", email: "seed-admin@example.local" },
    { id: SEED_INSTRUCTOR, role: "instructor", name: "Seed Instructor", initials: "SI", email: "seed-instructor@example.local" },
    { id: SEED_LEARNER, role: "student", name: "Seed Learner", initials: "SL", email: "seed-learner@example.local" },
  ]) {
    lines.push(
      isSqlite
        ? `insert into profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('${p.id}', 'ses', '${p.role}', '${esc(p.name)}', '${p.initials}', '${p.email}', 0, ${nowExpr()}) on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, initials = excluded.initials, email = excluded.email;`
        : `insert into public.profiles (id, tenant_id, role, display_name, initials, email, disabled, created_at) values ('${p.id}', 'ses', '${p.role}', '${esc(p.name)}', '${p.initials}', '${p.email}', false, ${nowExpr()}) on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, initials = excluded.initials, email = excluded.email;`,
    );
  }

  // 教材コース (TypeScript 入門研修) にも登録しておく。 登録が無いと出題 API
  // (`/api/quiz/for-lesson`) も資料もアクセス不可になり、 seed だけでは検証できない。
  for (const [id, slug] of [
    [SEED_ENROLLMENT, "web-fundamentals"],
    ...content.courses.map((c) => [`seed-enrollment-learner-${c.id}`, c.id] as const),
  ] as const) {
    lines.push(
      [
        `insert into ${tbl("enrollments")} (id, tenant_id, user_id, course_id, assigned_by, due_at, required, status, enrolled_at, completed_at)`,
        `select '${id}', 'ses', '${SEED_LEARNER}', c.id, '${SEED_INSTRUCTOR}', null, 1, 'active', ${nowExpr()}, null`,
        `from ${tbl("courses")} c`,
        `where c.tenant_id = 'ses' and c.slug = '${esc(slug)}'`,
        `on conflict (user_id, course_id) do update set status = excluded.status, required = excluded.required;`,
      ].join(" "),
    );
  }

  lines.push(
    `insert into ${tbl("submissions")} (id, tenant_id, student_id, lesson_id, assignment_id, course_title, section_title, assignment_title, code, status, priority, attempt, ai_ready, ai_suggestions, rubric, review_notes, verdict, submitted_at, reviewed_at, reviewer_id) values ('${SEED_SUBMISSION}', 'ses', '${SEED_LEARNER}', '${webFundLessonId}', 'S0-Ch00-01-print-hello', 'Web開発基礎 — HTML / CSS / JavaScript', '03. JavaScript 基礎', ${strLit("console.log で文字を出す")}, ${strLit("console.log('hello');\n")}, 'pending', 'normal', 1, ${isSqlite ? "0" : "false"}, '[]', '[]', '', null, ${nowExpr()}, null, null) on conflict (id) do update set code = excluded.code, status = excluded.status, student_id = excluded.student_id;`,
  );
}

if (!isSqlite) lines.push("commit;");
console.log(lines.join("\n"));
