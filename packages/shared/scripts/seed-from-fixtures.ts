/**
 * fixtures (apps/web/src/data/fixtures.ts) と @falcon/shared の assignments を
 * Supabase の courses / sections / lessons / assignments テーブルへ流し込む seed スクリプト。
 *
 * 使い方:
 *   SUPABASE_URL=https://xxxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun run packages/shared/scripts/seed-from-fixtures.ts
 *
 * 注意:
 *  - service_role キーは RLS を bypass する。 ブラウザに公開しないこと。
 *  - 同一 (tenant_id, slug) のコースは title 等が上書きされ、 セクション / レッスンは
 *    一度全削除されてから再挿入される (idempotent な再実行のため)。
 */

import { createClient } from "@supabase/supabase-js";

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

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("[seed] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedTenants(tenants: Tenant[]) {
  for (const t of tenants) {
    const { error } = await supabase.from("tenants").upsert({
      id: t.id,
      name: t.name,
      subtitle: t.subtitle,
      icon: t.icon,
      active_count: t.active,
    });
    if (error) throw new Error(`tenant ${t.id}: ${error.message}`);
  }
  console.log(`[seed] tenants: ${tenants.length} upserted`);
}

async function seedCourse(tenantId: Tenant["id"], course: Course): Promise<string> {
  // upsert by (tenant_id, slug)
  const { data, error } = await supabase
    .from("courses")
    .upsert(
      {
        tenant_id: tenantId,
        slug: course.id,
        title: course.title,
        category: course.category,
        color: course.color,
        duration_hours: course.duration ?? null,
        description: course.description ?? null,
        status: "published",
      },
      { onConflict: "tenant_id,slug" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`course ${course.id}: ${error?.message ?? "empty"}`);
  return data.id as string;
}

async function clearCourseChildren(courseId: string) {
  // sections の cascade で lessons も削除される。
  const { error } = await supabase.from("sections").delete().eq("course_id", courseId);
  if (error) throw new Error(`clear sections of ${courseId}: ${error.message}`);
}

async function seedSection(courseId: string, order: number, section: Section): Promise<string> {
  const { data, error } = await supabase
    .from("sections")
    .insert({
      course_id: courseId,
      title: section.title,
      order,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`section ${section.id}: ${error?.message ?? "empty"}`);
  return data.id as string;
}

async function seedLesson(sectionId: string, order: number, lesson: Lesson) {
  const { error } = await supabase.from("lessons").insert({
    section_id: sectionId,
    title: lesson.title,
    type: lesson.type,
    order,
    duration_label: lesson.duration,
    video_path: lesson.videoPath ?? null,
    pdf_path: lesson.pdfPath ?? null,
    markdown: lesson.markdown ?? null,
    assignment_id: lesson.assignmentId ?? null,
    total_pages: lesson.totalPages ?? null,
    total_sec: lesson.totalSec ?? null,
  });
  if (error) throw new Error(`lesson ${lesson.id}: ${error.message}`);
}

async function seedAssignment(tenantId: Tenant["id"], assignmentId: string) {
  const a = findAssignment(assignmentId);
  if (!a) {
    console.warn(`[seed] assignment ${assignmentId} not found in @falcon/shared — skipped`);
    return;
  }
  const settings = getStaticAnalysisSettings(a);
  const { error } = await supabase.from("assignments").upsert({
    id: a.id,
    tenant_id: tenantId,
    stage: a.stage,
    chapter_id: a.chapterId,
    title: a.title,
    description: a.description,
    language: getLanguage(a),
    test_kind: a.testKind,
    starter_files: a.starterFiles,
    entry_file: getEntryFile(a),
    entry_points: a.entryPoints ?? null,
    tests: a.tests,
    sql_seed: a.sqlSeed ?? null,
    lint_preset: a.lintPreset ?? null,
    static_analysis: {
      eslint: { rules: settings.eslintRules },
      ast: settings.ast,
    },
    mutation: a.mutation ?? null,
    demo_call: a.demoCall ?? null,
  });
  if (error) throw new Error(`assignment ${a.id}: ${error.message}`);
}

async function seedTenantCourses(tenantId: Tenant["id"], courses: Course[]) {
  for (const course of courses) {
    const courseUuid = await seedCourse(tenantId, course);
    await clearCourseChildren(courseUuid);
    const sections = course.sections ?? [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionUuid = await seedSection(courseUuid, i, section);
      for (let j = 0; j < section.lessons.length; j++) {
        const lesson = section.lessons[j];
        await seedLesson(sectionUuid, j, lesson);
        if (lesson.assignmentId) {
          await seedAssignment(tenantId, lesson.assignmentId);
        }
      }
    }
    console.log(`[seed] course "${course.title}" — ${sections.length} sections seeded`);
  }
}

async function main() {
  await seedTenants(TENANTS);
  await seedTenantCourses("ses", SES_COURSES);
  await seedTenantCourses("coach", COACH_COURSES);
  console.log("[seed] done");
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
