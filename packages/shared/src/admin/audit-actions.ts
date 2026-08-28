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
  // ステージ (CMS #10)
  // 改名前に記録した `course_*` の行は `DEPRECATED_LABELS` 側で拾う
  // (過去ログの書き換えはしない)。
  stage_publish: "ステージ公開",
  stage_unpublish: "ステージ非公開",
  stage_status_change: "ステージ状態変更",
  stage_delete: "ステージ削除",
  // 受講登録 (#20)
  //
  // Phase 3b で **割当を廃止** した。 登録を作る入口は受講者の自己開始だけで、
  // 退役した割当の action は `DEPRECATED_LABELS` にある (記録側の型から外して、
  // 「もう記録できない」 を型で担保する)。 更新 / 解除は staff の運用操作として残る。
  stage_self_start: "ステージの自己開始",
  enrollment_update: "受講登録の更新",
  enrollment_delete: "受講登録の解除",
  // 割当プリセット (定義の CRUD だけ残置。 適用は退役)
  enrollment_preset_create: "割当プリセットの作成",
  enrollment_preset_update: "割当プリセットの更新",
  enrollment_preset_delete: "割当プリセットの削除",
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
  // 発見教材 (Phase 4)
  //
  // 生成・編集・レビューを分けて残す。 「AI が作ったものを誰が公開したか」 は後から
  // 必ず問われるので、 承認 (公開) の記録は生成の記録と別に読めた方がよい。
  // 内容の編集も別に残す — 承認済みの教材を直すと承認が外れる (再承認が要る) ため、
  // 「いつ中身が変わったか」 が読めないと承認の記録だけでは経緯を追えない。
  discovery_generate: "発見教材の下書き生成",
  discovery_material_edit: "発見教材の内容編集",
  discovery_review: "発見教材のレビュー",
  // 殿堂 (Phase 5)
  //
  // **本人の辞退 (decline) と取り下げ (withdraw) は記録しない。** 監査は運営の操作
  // (誰を選び、誰が公開したか) を追うためのもので、辞退の記録はそこに要らない。
  // 「断ると記録が残る」と分かっている招待は、断りにくい招待になる — 不利益が無い
  // という約束を仕組みの側で守るために、辞退の痕跡は残さない。
  // 掲載の申請 (hof_submit) は本人の操作だが、**公開への同意そのもの**なので残す。
  hof_nominate: "殿堂への推薦",
  hof_submit: "殿堂への掲載申請",
  hof_publish: "殿堂の公開",
  hof_close: "殿堂の非公開化",
  // スキルシート (#203)
  skill_sheet_upload: "スキルシートのアップロード",
  skill_sheet_update: "スキルシートの更新",
} as const;

/**
 * もう記録されないが、 過去ログには残っている action。
 *
 * course → stage のリネーム (Phase 0) 以前に記録された行は action コードが `course_*`
 * のままで、 書き換えはしない。 ラベルだけ残しておかないと監査画面で生の
 * `course_publish` が並ぶ。 Phase 3b で退役した **割当** の action も同じ扱い。
 * `LABELS` と分けてあるのは、 記録側 (`recordAudit()`) が `AuditAction` で縛られている
 * 以上、 旧 action を再び記録できるようにしないため — 絞り込みの選択肢は
 * `AUDIT_ACTION_FILTER_LABELS` が両方を混ぜて作るので、 定義が 2 か所に割れることもない。
 */
const DEPRECATED_LABELS: Record<string, string> = {
  course_publish: "ステージ公開 (旧)",
  course_unpublish: "ステージ非公開 (旧)",
  course_status_change: "ステージ状態変更 (旧)",
  course_delete: "ステージ削除 (旧)",
  // Phase 3b で退役した割当 (今の入口は `stage_self_start`)。
  enrollment_create: "受講登録の割当 (旧)",
  enrollment_bulk_create: "受講登録の一括割当 (旧)",
  enrollment_bulk_delete: "受講登録の一括解除 (旧)",
  enrollment_preset_apply: "割当プリセットの適用 (旧)",
};

/** 記録しうる監査アクション。 記録側・表示側の双方がこの型を共有する。 */
export type AuditAction = keyof typeof LABELS;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = LABELS;

/**
 * 監査ログの絞り込み選択肢。 過去ログを引けるよう、 廃止済み action も含む
 * (記録側の型は `AuditAction` のままなので、 新規記録には使えない)。
 */
export const AUDIT_ACTION_FILTER_LABELS: Record<string, string> = {
  ...LABELS,
  ...DEPRECATED_LABELS,
};

/** 既知の action は日本語ラベル、 未知の action は素のまま返す。 */
export function auditActionLabel(action: string): string {
  return (LABELS as Record<string, string>)[action] ?? DEPRECATED_LABELS[action] ?? action;
}
