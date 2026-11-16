import type { GradebookEntry, StageGradebook } from "@stella/shared/cms/types";
import { toCsv } from "./csv";

export function gradebookTaskLabel(
  row: Pick<GradebookEntry, "completion" | "manual_tasks" | "manual_problems">,
): string {
  const c = row.completion;
  const counts = [
    row.manual_tasks ? `${row.manual_tasks} 課題` : "",
    row.manual_problems ? `${row.manual_problems} 問` : "",
  ]
    .filter(Boolean)
    .join("・");
  return `${c ? `${c.passed_assignments}/${c.total_assignments}` : "—"}${counts ? `（手で済み ${counts}）` : ""}`;
}
const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  active: "受講中",
  completed: "完了",
  expired: "期限切れ",
};

export function gradebookCsv(data: StageGradebook): string {
  const headers = [
    "受講者",
    "メール",
    "受講状態",
    "期限",
    "登録日",
    "レッスン完了",
    "レッスン総数",
    "小テスト合格",
    "小テスト総数",
    "課題合格",
    "課題総数",
    "手で済みの課題数",
    "手で済みの問題数",
    "達成",
    "修了証",
    "認定番号",
  ];
  const rows = data.rows.map((r) => {
    const c = r.completion;
    return [
      r.display_name,
      r.email ?? "",
      ENROLLMENT_STATUS_LABEL[r.enrollment_status] ?? r.enrollment_status,
      r.due_at ? r.due_at.slice(0, 10) : "",
      r.enrolled_at ? r.enrolled_at.slice(0, 10) : "",
      c?.completed_lessons ?? "",
      c?.total_lessons ?? "",
      c?.passed_quizzes ?? "",
      c?.total_quizzes ?? "",
      c?.passed_assignments ?? "",
      c?.total_assignments ?? "",
      r.manual_tasks ?? 0,
      r.manual_problems ?? 0,
      c?.met ? "達成" : "未達成",
      c?.has_certificate ? "発行済み" : "",
      c?.cert_code ?? "",
    ];
  });
  return toCsv(headers, rows);
}
