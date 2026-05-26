/**
 * fixtures を Postgres INSERT SQL に変換（superuser / SQL Editor 用）。
 * 出力: stdout
 *
 *   bun run packages/shared/scripts/export-seed-sql.ts | psql ...
 *   または Supabase MCP execute_sql で実行
 */

import {
  COACH_COURSES,
  SES_COURSES,
  TENANTS,
} from "../../../apps/web/src/data/fixtures.js";
import type { Course, Lesson, Section, Tenant } from "../../../apps/web/src/data/types.js";

import { findAssignment } from "../src/problems/index.js";
import {
  getEntryFile,
  getLanguage,
  getStaticAnalysisSettings,
} from "../src/assignment-helpers.js";

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

/** 複数行テキスト用の dollar-quoted リテラル */
function dollar(s: string): string {
  let tag = "d";
  while (s.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${s}$${tag}$`;
}

function json(v: unknown): string {
  return esc(JSON.stringify(v));
}

const courseIdMap = new Map<string, string>();
const sectionIdMap = new Map<string, string>();
const emittedAssignments = new Set<string>();

const lines: string[] = [
  "-- seed from fixtures (generated)",
  "begin;",
];

for (const t of TENANTS) {
  lines.push(
    `insert into public.tenants (id, name, subtitle, icon, active_count) values ('${esc(t.id)}', '${esc(t.name)}', ${t.subtitle ? `'${esc(t.subtitle)}'` : "null"}, ${t.icon ? `'${esc(t.icon)}'` : "null"}, ${t.active}) on conflict (id) do update set name = excluded.name, subtitle = excluded.subtitle, icon = excluded.icon, active_count = excluded.active_count;`,
  );
}

function emitCourse(tenantId: Tenant["id"], course: Course) {
  const slug = esc(course.id);
  const cid = `course_${tenantId}_${slug.replace(/-/g, "_")}`;
  courseIdMap.set(`${tenantId}:${course.id}`, cid);
  lines.push(
    `insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), '${esc(tenantId)}', '${slug}', '${esc(course.title)}', ${course.category ? `'${esc(course.category)}'` : "null"}, ${course.color ? `'${course.color}'` : "null"}, ${course.duration ?? "null"}, ${course.description ? `'${esc(course.description)}'` : "null"}, 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();`,
  );
  lines.push(
    `-- ${cid} course uuid variable via subselect`,
    `delete from public.sections where course_id in (select id from public.courses where tenant_id = '${esc(tenantId)}' and slug = '${slug}');`,
  );

  const sections = course.sections ?? [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sid = `section_${cid}_${i}`;
    sectionIdMap.set(`${tenantId}:${course.id}:${section.id}`, sid);
    lines.push(
      `insert into public.sections (id, course_id, title, "order") select gen_random_uuid(), (select id from public.courses where tenant_id = '${esc(tenantId)}' and slug = '${slug}' limit 1), '${esc(section.title)}', ${i};`,
    );
    for (let j = 0; j < section.lessons.length; j++) {
      const lesson = section.lessons[j];
      emitLesson(tenantId, slug, i, j, lesson);
      if (lesson.assignmentId && !emittedAssignments.has(lesson.assignmentId)) {
        emittedAssignments.add(lesson.assignmentId);
        emitAssignment(tenantId, lesson.assignmentId);
      }
    }
  }
}

function emitLesson(
  tenantId: string,
  courseSlug: string,
  sectionOrder: number,
  lessonOrder: number,
  lesson: Lesson,
) {
  lines.push(
    `insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '${esc(lesson.title)}', '${lesson.type}', ${lessonOrder}, ${lesson.duration ? `'${esc(lesson.duration)}'` : "null"}, ${lesson.videoPath ? `'${esc(lesson.videoPath)}'` : "null"}, ${lesson.pdfPath ? `'${esc(lesson.pdfPath)}'` : "null"}, ${lesson.markdown ? `'${esc(lesson.markdown)}'` : "null"}, ${lesson.assignmentId ? `'${esc(lesson.assignmentId)}'` : "null"}, ${lesson.totalPages ?? "null"}, ${lesson.totalSec ?? "null"} from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = '${esc(tenantId)}' and c.slug = '${courseSlug}' and s."order" = ${sectionOrder};`,
  );
}

function emitAssignment(tenantId: Tenant["id"], assignmentId: string) {
  const a = findAssignment(assignmentId);
  if (!a) {
    lines.push(`-- assignment ${assignmentId} not in shared — skipped`);
    return;
  }
  const settings = getStaticAnalysisSettings(a);
  lines.push(
    `insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('${esc(a.id)}', '${esc(tenantId)}', '${esc(a.stage)}', '${esc(a.chapterId)}', '${esc(a.title)}', ${dollar(a.description)}, '${getLanguage(a)}', '${a.testKind}', '${json(a.starterFiles)}'::jsonb, '${esc(getEntryFile(a))}', ${a.entryPoints ? `'${json(a.entryPoints)}'::jsonb` : "null"}, '${json(a.tests)}'::jsonb, ${a.sqlSeed ? dollar(a.sqlSeed) : "null"}, ${a.lintPreset ? `'${esc(a.lintPreset)}'` : "null"}, '${json({ eslint: { rules: settings.eslintRules }, ast: settings.ast })}'::jsonb, ${a.mutation ? `'${json(a.mutation)}'::jsonb` : "null"}, ${a.demoCall ? `'${esc(a.demoCall)}'` : "null"}) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;`,
  );
}

for (const c of SES_COURSES) emitCourse("ses", c);
for (const c of COACH_COURSES) emitCourse("coach", c);

lines.push("commit;");
console.log(lines.join("\n"));
