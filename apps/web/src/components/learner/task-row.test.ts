import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TaskStatus, TaskSummary } from "@stella/shared/tasks/catalog";
import { taskProblemCountLabel, taskStatusLabel } from "@/lib/task-row";

import { TaskRowProgress } from "./TaskList";

const task = (status: TaskStatus, over: Partial<TaskSummary> = {}): TaskSummary => ({
  id: "t",
  sectionId: "s",
  title: "税込価格",
  kind: "basic",
  pattern: "html-page",
  skills: { uses: [], assesses: [] },
  estimatedMinutes: 30,
  status,
  lessonId: null,
  ...over,
});

describe("課題の行", () => {
  it("問題つきの課題は件数を出し、手元の合格は取り組み中と読む", () => {
    const row = task("local-passed", { problems_total: 20, problems_passed: 12 });
    expect(taskProblemCountLabel(row)).toBe("12/20 問");
    expect(taskStatusLabel(row)).toBe("取り組み中");
    const markup = renderToStaticMarkup(createElement(TaskRowProgress, { task: row }));
    expect(markup).toContain("12/20 問");
    expect(markup).toContain("約30分");
  });

  it("問題の無い課題は件数を出さず、手元の合格の文言を変えない", () => {
    const row = task("local-passed");
    expect(taskProblemCountLabel(row)).toBeNull();
    expect(taskStatusLabel(row)).toBe("手元で合格");
    const markup = renderToStaticMarkup(createElement(TaskRowProgress, { task: row }));
    expect(markup).not.toContain("問");
    expect(taskStatusLabel(task("submitted"))).toBe("AI が確認中");
  });

  it("問題つきの課題は AI の確認待ちを出さず、そろったら合格", () => {
    const row = task("submitted", { problems_total: 20, problems_passed: 12 });
    expect(taskStatusLabel(row)).toBe("取り組み中");
    expect(taskStatusLabel({ ...row, status: "instructor-pending" })).toBe("取り組み中");
    expect(taskStatusLabel({ ...row, status: "passed", problems_passed: 20 })).toBe("合格");
    expect(taskStatusLabel({ ...row, status: "not-started", problems_passed: 0 })).toBe("未着手");
  });
});
