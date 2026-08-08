/**
 * fixtures を INSERT SQL に変換（D1 SQLite / 旧 Postgres 用）。
 *
 *   DIALECT=sqlite bun run packages/shared/scripts/export-seed-sql.ts   # D1
 *   bun run packages/shared/scripts/export-seed-sql.ts                  # Postgres (legacy)
 */

import { createHash } from "node:crypto";

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

const dialect = process.env.DIALECT === "sqlite" ? "sqlite" : "postgres";
const isSqlite = dialect === "sqlite";

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

/** 名前空間キーから安定した UUID 文字列を作る（再 seed で ID がずれないようにする）。 */
function stableUuid(key: string): string {
  const h = createHash("sha1").update(key).digest();
  const bytes = Uint8Array.from(h.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5-ish
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const courseIdMap = new Map<string, string>();
const sectionIdMap = new Map<string, string>();
const emittedAssignments = new Set<string>();

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
  lines.push(
    `delete from ${isSqlite ? "" : "public."}sections where course_id = '${courseUuid}';`,
  );

  const sections = course.sections ?? [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionUuid = stableUuid(`section:${tenantId}:${course.id}:${section.id}`);
    sectionIdMap.set(`${tenantId}:${course.id}:${section.id}`, sectionUuid);
    lines.push(
      `insert into ${isSqlite ? "" : "public."}sections (id, course_id, title, "order"${isSqlite ? ", created_at" : ""}) values ('${sectionUuid}', '${courseUuid}', '${esc(section.title)}', ${i}${isSqlite ? `, ${nowExpr()}` : ""});`,
    );
    for (let j = 0; j < section.lessons.length; j++) {
      const lesson = section.lessons[j];
      emitLesson(tenantId, course.id, section.id, sectionUuid, j, lesson);
      if (lesson.assignmentId && !emittedAssignments.has(lesson.assignmentId)) {
        emittedAssignments.add(lesson.assignmentId);
        emitAssignment(tenantId, lesson.assignmentId);
      }
    }
  }
}

function emitLesson(
  tenantId: Tenant["id"],
  courseId: string,
  sectionId: string,
  sectionUuid: string,
  lessonOrder: number,
  lesson: Lesson,
) {
  const lessonUuid = stableUuid(`lesson:${tenantId}:${courseId}:${sectionId}:${lesson.id}`);
  lines.push(
    `insert into ${isSqlite ? "" : "public."}lessons (id, section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec${isSqlite ? ", created_at, updated_at" : ""}) values ('${lessonUuid}', '${sectionUuid}', '${esc(lesson.title)}', '${lesson.type}', ${lessonOrder}, ${lesson.duration ? `'${esc(lesson.duration)}'` : "null"}, ${lesson.videoPath ? `'${esc(lesson.videoPath)}'` : "null"}, ${lesson.pdfPath ? `'${esc(lesson.pdfPath)}'` : "null"}, ${lesson.markdown ? `'${esc(lesson.markdown)}'` : "null"}, ${lesson.assignmentId ? `'${esc(lesson.assignmentId)}'` : "null"}, ${lesson.totalPages ?? "null"}, ${lesson.totalSec ?? "null"}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""});`,
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

for (const c of SES_COURSES) emitCourse("ses", c);
for (const c of COACH_COURSES) emitCourse("coach", c);

// Minimal verification scenario (stable IDs for queue / list smoke checks)
const SEED_ADMIN = "seed-admin";
const SEED_INSTRUCTOR = "seed-instructor";
const SEED_LEARNER = "seed-learner";
const SEED_ENROLLMENT = "seed-enrollment-learner-web-fundamentals";
const SEED_SUBMISSION = "seed-submission-pending-1";
const webFundCourseId = stableUuid("course:ses:web-fundamentals");
const webFundLessonId = stableUuid("lesson:ses:web-fundamentals:s3:l11a");
const tbl = (name: string) => (isSqlite ? name : `public.${name}`);

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

lines.push(
  `insert into ${tbl("enrollments")} (id, tenant_id, user_id, course_id, assigned_by, due_at, required, status, enrolled_at, completed_at) values ('${SEED_ENROLLMENT}', 'ses', '${SEED_LEARNER}', '${webFundCourseId}', '${SEED_INSTRUCTOR}', null, 1, 'active', ${nowExpr()}, null) on conflict (user_id, course_id) do update set status = excluded.status, required = excluded.required;`,
);

lines.push(
  `insert into ${tbl("submissions")} (id, tenant_id, student_id, lesson_id, assignment_id, course_title, section_title, assignment_title, code, status, priority, attempt, ai_ready, ai_suggestions, rubric, review_notes, verdict, submitted_at, reviewed_at, reviewer_id) values ('${SEED_SUBMISSION}', 'ses', '${SEED_LEARNER}', '${webFundLessonId}', 'S0-Ch00-01-print-hello', 'Web開発基礎 — HTML / CSS / JavaScript', '03. JavaScript 基礎', ${strLit("console.log で文字を出す")}, ${strLit("console.log('hello');\n")}, 'pending', 'normal', 1, ${isSqlite ? "0" : "false"}, '[]', '[]', '', null, ${nowExpr()}, null, null) on conflict (id) do update set code = excluded.code, status = excluded.status, student_id = excluded.student_id;`,
);

if (!isSqlite) lines.push("commit;");
console.log(lines.join("\n"));
