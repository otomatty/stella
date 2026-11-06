import type { CertificateRow, StageCompletion } from "@stella/shared/cms/types";
import type { Stage } from "@/data/types";
import { findNextLesson, type LessonProgressMap } from "@/lib/lesson-progress";

export function continueTarget(
  stage: Stage | undefined,
  map: LessonProgressMap,
): { kind: "lesson"; lessonId: string } | { kind: "stage" } {
  const next = findNextLesson(stage, map);
  return next ? { kind: "lesson", lessonId: next.lesson.id } : { kind: "stage" };
}

export interface OverviewStage {
  id: string;
  title: string;
  category: string;
  stage?: Stage;
}

export interface CompletionItem {
  label: string;
  done: number;
  total: number;
  met: boolean;
}

export interface NearCertificate extends OverviewStage {
  items: CompletionItem[];
  percent: number;
  remaining: number;
  remainingText: string;
}

/** 必須の修了条件だけを集計する。入力の配列・行は変更しない。 */
export function buildCertificateOverview({
  stages,
  certificates,
  completions,
}: {
  stages: readonly Stage[];
  certificates: readonly CertificateRow[];
  completions: readonly StageCompletion[];
}) {
  const issued = certificates
    .filter((cert) => !cert.revoked)
    .sort((a, b) => Date.parse(b.issued_at) - Date.parse(a.issued_at));
  const issuedStages = new Set(issued.map((cert) => cert.stage_id));
  const completionMap = new Map(completions.map((completion) => [completion.stage_id, completion]));
  const stageMap = new Map<string, OverviewStage>(
    stages.map((stage) => [
      stage.id,
      { id: stage.id, title: stage.title, category: stage.category, stage },
    ]),
  );
  for (const completion of completions) {
    if (!stageMap.has(completion.stage_id)) {
      stageMap.set(completion.stage_id, {
        id: completion.stage_id,
        title: completion.stage_title,
        category: "",
      });
    }
  }
  const pending: (OverviewStage & { autoIssue: boolean })[] = [];
  const near: NearCertificate[] = [];
  const idle: OverviewStage[] = [];
  for (const stage of stageMap.values()) {
    const completion = completionMap.get(stage.id);
    if (issuedStages.has(stage.id) || completion?.has_certificate) continue;
    if (completion?.met) {
      pending.push({ ...stage, autoIssue: completion.criteria.auto_issue_certificate });
      continue;
    }
    if (!completion) {
      if (stage.stage?.completed === true) continue;
      idle.push(stage);
      continue;
    }
    const candidates = [
      {
        label: "レッスン",
        required: completion.criteria.require_all_lessons,
        done: completion.completed_lessons,
        total: completion.total_lessons,
      },
      {
        label: "小テスト",
        required: completion.criteria.require_quiz_pass,
        done: completion.passed_quizzes,
        total: completion.total_quizzes,
      },
      {
        label: "課題",
        required: completion.criteria.require_assignment_pass,
        done: completion.passed_assignments,
        total: completion.total_assignments,
      },
    ];
    const items = candidates
      .filter((item) => item.required && item.total > 0)
      .map(({ label, done, total }) => ({ label, done, total, met: done >= total }));
    const done = items.reduce((sum, item) => sum + item.done, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    if (done === 0 || total === 0) {
      idle.push(stage);
      continue;
    }
    const remaining = items.reduce((sum, item) => sum + Math.max(0, item.total - item.done), 0);
    const parts = items
      .filter((item) => !item.met)
      .map((item) => `${item.label} ${item.total - item.done}`);
    near.push({
      ...stage,
      items,
      percent: Math.min(99, Math.floor((done / total) * 100)),
      remaining,
      remainingText: `あと ${remaining} 件${parts.length ? `（${parts.join("・")}）` : ""}`,
    });
  }
  near.sort((a, b) => a.remaining - b.remaining || a.title.localeCompare(b.title, "ja"));
  return { issued, pending, near, idle };
}
