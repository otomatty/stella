/** 管理者による過去の学習の移行。コードはこの API に含めない。 */
export type CompletionReviewSource = "ai" | "human" | "tests" | "manual";
export interface ManualCompletionItem {
  taskId: string;
  /** 省略すると今の版の全問。問題のない課題では省略する。 */
  problemIds?: string[];
}
export interface ManualCompletionRequest {
  userId: string;
  stageId: string;
  items: ManualCompletionItem[];
  reason: string;
}
export type ManualRevokeRequest = Omit<ManualCompletionRequest, "reason">;
export interface ManualCompletionResult {
  inserted: number;
  skipped: number;
  passedTaskIds: string[];
}
export interface ManualRevokeResult {
  deleted: number;
  blocked: { taskId: string; problemId?: string; reason: string }[];
}
export interface ManualCompletionView {
  userId: string;
  stageId: string;
  units: {
    id: string;
    title: string;
    tasks: {
      id: string;
      title: string;
      status: string;
      reviewSource: CompletionReviewSource | null;
      manualReason: string | null;
      problems: {
        id: string;
        title: string;
        status: "passed" | "not-submitted";
        source: "tests" | "manual" | null;
        manualReason: string | null;
        manualByName: string | null;
        manualAt: string | null;
      }[];
    }[];
  }[];
}
