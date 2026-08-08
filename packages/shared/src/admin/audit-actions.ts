/**
 * 監査ログの操作種別 (action) と日本語ラベル。
 *
 * 監査ログ画面 (#27) とレポートの監査種別 (#75) の双方が同じ語で表示するよう、
 * ラベルはここを唯一の定義とする。 配色などの表示上の属性は画面側に持たせる。
 */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  role_change: "ロール変更",
  user_invite: "ユーザー招待",
  user_disable: "ユーザー無効化",
  user_enable: "ユーザー復帰",
  course_publish: "コース公開",
  course_unpublish: "コース非公開",
  course_status_change: "コース状態変更",
  course_delete: "コース削除",
  org_create: "組織作成",
  org_update: "組織更新",
  login: "ログイン",
};

/** 既知の action は日本語ラベル、 未知の action は素のまま返す。 */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
