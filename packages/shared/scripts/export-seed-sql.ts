/**
 * fixtures を INSERT SQL に変換（D1 SQLite / 旧 Postgres 用）。
 *
 *   DIALECT=sqlite bun run packages/shared/scripts/export-seed-sql.ts   # D1
 *   bun run packages/shared/scripts/export-seed-sql.ts                  # Postgres (legacy)
 */

import {
  COACH_COURSES,
  SES_COURSES,
  TENANTS,
} from "../../../apps/web/src/data/fixtures.js";
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

function uuid(): string {
  return crypto.randomUUID();
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
  const courseUuid = uuid();
  courseIdMap.set(`${tenantId}:${course.id}`, courseUuid);
  lines.push(
    `insert into ${isSqlite ? "" : "public."}courses (id, tenant_id, slug, title, category, color, duration_hours, description, status${isSqlite ? ", created_at, updated_at" : ""}) values ('${courseUuid}', '${esc(tenantId)}', '${slug}', '${esc(course.title)}', ${course.category ? `'${esc(course.category)}'` : "null"}, ${course.color ? `'${esc(course.color)}'` : "null"}, ${course.duration ?? "null"}, ${course.description ? `'${esc(course.description)}'` : "null"}, 'published'${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = ${nowExpr()};`,
  );
  lines.push(
    `delete from ${isSqlite ? "" : "public."}sections where course_id = '${courseUuid}';`,
  );

  const sections = course.sections ?? [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionUuid = uuid();
    sectionIdMap.set(`${tenantId}:${course.id}:${section.id}`, sectionUuid);
    lines.push(
      `insert into ${isSqlite ? "" : "public."}sections (id, course_id, title, "order"${isSqlite ? ", created_at" : ""}) values ('${sectionUuid}', '${courseUuid}', '${esc(section.title)}', ${i}${isSqlite ? `, ${nowExpr()}` : ""});`,
    );
    for (let j = 0; j < section.lessons.length; j++) {
      const lesson = section.lessons[j];
      emitLesson(sectionUuid, j, lesson);
      if (lesson.assignmentId && !emittedAssignments.has(lesson.assignmentId)) {
        emittedAssignments.add(lesson.assignmentId);
        emitAssignment(tenantId, lesson.assignmentId);
      }
    }
  }
}

function emitLesson(sectionUuid: string, lessonOrder: number, lesson: Lesson) {
  const lessonUuid = uuid();
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

if (!isSqlite) lines.push("commit;");
console.log(lines.join("\n"));
