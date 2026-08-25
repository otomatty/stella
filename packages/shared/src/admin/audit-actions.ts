/**
 * 監査ログの操作種別 (action) と日本語ラベル。
 *
 * 監査ログ画面 (#27) とレポートの監査種別 (#75) の双方が同じ語で表示するよう、
 * ラベルはここを唯一の定義とする。 配色などの表示上の属性は画面側に持たせる。
 *
 * API 側 (`apps/api/src/lib/audit.ts`) の `recordAudit()` は `AuditAction` を受け取るため、
 * ここに無い action を記録しようとすると型エラーになる。 記録側とラベル側のズレ
 * (Issue #64 — `role_change` ラベルに対し記録は `user_role_change` だった) を構造的に防ぐ。
 */

const LABELS = {
  // 認証
  login: "ログイン",
  // ユーザー管理 (#22)
  user_invite: "ユーザー招待",
  user_role_change: "ロール変更",
  user_disable: "ユーザー無効化",
  user_enable: "ユーザー復帰",
  // コース (CMS #10)
  course_publish: "コース公開",
  course_unpublish: "コース非公開",
  course_status_change: "コース状態変更",
  course_delete: "コース削除",
  // 受講登録 (#20)
  enrollment_create: "受講登録",
  enrollment_update: "受講登録の更新",
  enrollment_delete: "受講登録の解除",
  enrollment_bulk_create: "受講登録の一括割当",
  enrollment_bulk_delete: "受講登録の一括解除",
  // 割当プリセット
  enrollment_preset_create: "割当プリセットの作成",
  enrollment_preset_update: "割当プリセットの更新",
  enrollment_preset_delete: "割当プリセットの削除",
  enrollment_preset_apply: "割当プリセットの適用",
  // 修了証 (#26)
  certificate_issue: "修了証発行",
  // 組織マスタ (#29)
  org_create: "組織作成",
  org_update: "組織更新",
  // テナント設定 (#76)
  test_mode_enable: "テストモード有効化",
  test_mode_disable: "テストモード無効化",
  // ストレージ保守 (#64)
  r2_orphan_cleanup: "教材ストレージの孤児削除",
  // 面談対策
  interview_prep_assign: "面談対策の割当",
  interview_tts_generate: "面談対策 質問音声の生成",
  interview_question_edit: "面談対策 想定質問の編集",
  answer_template_generated: "回答の型の AI 生成",
  answer_template_edited: "回答の型の編集",
  // スキルシート (#203)
  skill_sheet_upload: "スキルシートのアップロード",
  skill_sheet_update: "スキルシートの更新",
} as const;

/** 記録しうる監査アクション。 記録側・表示側の双方がこの型を共有する。 */
export type AuditAction = keyof typeof LABELS;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = LABELS;

/** 既知の action は日本語ラベル、 未知の action は素のまま返す。 */
export function auditActionLabel(action: string): string {
  return (LABELS as Record<string, string>)[action] ?? action;
}
