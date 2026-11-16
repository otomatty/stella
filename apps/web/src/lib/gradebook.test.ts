import type { GradebookEntry, StageGradebook } from "@stella/shared/cms/types";
import { describe, expect, it } from "vitest";
import { gradebookCsv, gradebookTaskLabel } from "./gradebook";
const entry: GradebookEntry = {
  user_id: "fictional-user",
  display_name: "架空の受講者",
  initials: null,
  email: null,
  enrollment_status: "active",
  due_at: null,
  enrolled_at: "2026-01-01",
  manual_tasks: 5,
  manual_problems: 320,
  completion: {
    user_id: "fictional-user",
    stage_id: "fictional-stage",
    stage_title: "架空のステージ",
    total_lessons: 1,
    completed_lessons: 1,
    total_quizzes: 0,
    passed_quizzes: 0,
    total_assignments: 19,
    passed_assignments: 12,
    criteria: {
      require_all_lessons: true,
      require_quiz_pass: false,
      require_assignment_pass: true,
      auto_issue_certificate: false,
    },
    met: false,
    has_certificate: false,
    cert_code: null,
  },
};
it("成績台帳は手で済みの課題と問題を添え、0は出さない", () => {
  expect(gradebookTaskLabel(entry)).toBe("12/19（手で済み 5 課題・320 問）");
  expect(gradebookTaskLabel({ ...entry, manual_tasks: 0, manual_problems: 0 })).toBe("12/19");
  expect(gradebookTaskLabel({ ...entry, manual_tasks: 0 })).toBe("12/19（手で済み 320 問）");
  expect(gradebookTaskLabel({ completion: null })).toBe("—");
});
describe("成績台帳のCSV", () => {
  it("見出しと同じ位置に手で済みの件数を出す", () => {
    const data: StageGradebook = {
      stage_id: "fictional-stage",
      stage_title: "架空のステージ",
      criteria: {
        require_all_lessons: true,
        require_quiz_pass: false,
        require_assignment_pass: true,
        auto_issue_certificate: false,
      },
      rows: [entry, { ...entry, manual_tasks: undefined, manual_problems: undefined }],
    };
    const lines = gradebookCsv(data)
      .split("\r\n")
      .map((line) => line.split(","));
    expect(lines[0].slice(9, 14)).toEqual([
      '"課題合格"',
      '"課題総数"',
      '"手で済みの課題数"',
      '"手で済みの問題数"',
      '"達成"',
    ]);
    expect(lines[1].slice(9, 14)).toEqual(['"12"', '"19"', '"5"', '"320"', '"未達成"']);
    expect(lines[2].slice(11, 13)).toEqual(['"0"', '"0"']);
    expect(lines.every((line) => line.length === lines[0].length)).toBe(true);
  });
});
