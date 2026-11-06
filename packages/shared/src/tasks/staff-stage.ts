import type { TaskKind } from "./manifest.js";

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
