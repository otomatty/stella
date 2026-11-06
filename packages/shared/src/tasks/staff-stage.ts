import type { TaskKind, TaskManifest } from "./manifest.js";

/** 講師・管理者向けのステージ内の課題と受講者の進捗集計。 */
export interface StaffStageTask {
  id: string;
  sectionId: string;
  title: string;
  kind: TaskKind;
  estimatedMinutes: number;
  lessonId: string | null;
  support: { hintLevels: number; solutionUnlock: string } | null;
  variantCount: number;
  counts: {
    started: number;
    localPassed: number;
    reviewing: number;
    waiting: number;
    resubmit: number;
    passed: number;
    submitted: number;
  };
}

export interface StaffStageTasksResponse {
  tasks: StaffStageTask[];
  prerequisites: { id: string; title: string }[];
}

/** 課題 ID が通常の 3 要素でなければステージのフォルダーに戻す。 */
export function staffTaskSourcePath(taskId: string, stageSlug: string): string {
  const parts = taskId.split("/");
  const root = `packages/content/stages/${stageSlug}`;
  if (
    parts.length !== 3 ||
    parts[0] !== stageSlug ||
    !parts.every((part) => /^[a-z0-9][a-z0-9._-]*$/.test(part))
  )
    return root;
  return `${root}/modules/${parts[1]}/tasks/${parts[2]}`;
}

export interface StaffTaskDetail {
  task: {
    id: string;
    title: string;
    kind: TaskKind;
    pattern: string;
    skills: { uses: string[]; assesses: string[] };
    estimatedMinutes: number;
    lessonId: string | null;
    contentHash: string;
    parentTaskId: string | null;
    manifest: TaskManifest;
  };
  stage: { id: string; slug: string; title: string };
  section: { id: string; title: string };
  sourcePath: string;
  readme: string | null;
  reviewNotes: string | null;
  rubric: { id: string; criterion: string; required: boolean }[];
  submission: { explanation: boolean; debuggingRecord: boolean };
  support: StaffStageTask["support"];
  codingRules: { id: string; title: string; statement: string; required: boolean }[];
  counts: StaffStageTask["counts"];
  helpOpens: {
    hints: { level: number; learners: number }[];
    solution: number;
    explanation: number;
  };
  revisions: { contentHash: string; createdAt: string }[];
  variants: { id: string; title: string; active: boolean }[];
  neighbors: {
    previous: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
  };
}
