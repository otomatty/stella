/** 06 §9 の引き継ぎと §11.3 の到達リストで使う入口。 */
export const FIRST_STAGE_SLUG = "dev-env-basics";
export const FIRST_TASK_ID = `${FIRST_STAGE_SLUG}/u02-first-task/q01-first-page`;
export const FIRST_STEP_KEYS = [
  "read-first-lesson",
  "connected-vscode",
  "checked-first-task",
  "submitted-first-task",
  "got-result",
] as const;
export type FirstStepKey = (typeof FIRST_STEP_KEYS)[number];
export interface FirstSteps {
  stage_id: string | null;
  /** ステージの受講登録。腕試しによる解放は含まない。 */
  stage_started: boolean;
  items: { key: FirstStepKey; done: boolean; at: string | null }[];
}
