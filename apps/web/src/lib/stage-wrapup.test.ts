import { describe, expect, it } from "vitest";

import type { TaskStatus, TaskSummary } from "@stella/shared/tasks/catalog";

import { stageWrapupOf } from "./stage-wrapup";

const task = (id: string, status: TaskStatus, over: Partial<TaskSummary> = {}): TaskSummary => ({
  id,
  sectionId: "s1",
  title: `課題 ${id}`,
  kind: "basic",
  pattern: "html-page",
  skills: { uses: [], assesses: [] },
  estimatedMinutes: 30,
  status,
  lessonId: `lesson-${id}`,
  ...over,
});

describe("stageWrapupOf", () => {
  it("課題が無い・すべて合格なら案内しない (修了の判定待ち)", () => {
    expect(stageWrapupOf([])).toBeNull();
    expect(stageWrapupOf([task("a", "passed"), task("b", "ai-passed")])).toBeNull();
  });

  it("未提出の課題を名指しし、受講者の番として課題文のレッスンを返す", () => {
    const wrapup = stageWrapupOf([task("a", "not-started", { title: "最初のページを作る" })]);
    expect(wrapup).toMatchObject({
      task: { id: "a", status: "not-started", lessonId: "lesson-a" },
      remaining: 1,
      learnerTurn: true,
    });
    expect(wrapup?.detail).toContain("「最初のページを作る」");
    expect(wrapup?.detail).toContain("提出");
    expect(wrapup?.detail).toContain("クリア");
  });

  it("手元で合格しただけ・再提出も受講者の番 (手元の合格ではクリアにならない)", () => {
    expect(stageWrapupOf([task("a", "local-passed")])?.learnerTurn).toBe(true);
    expect(stageWrapupOf([task("a", "local-passed")])?.detail).toContain("VS Code から提出");
    expect(stageWrapupOf([task("a", "resubmit")])?.learnerTurn).toBe(true);
  });

  it("レビュー待ちは受講者の番ではない", () => {
    expect(stageWrapupOf([task("a", "submitted")])).toMatchObject({ learnerTurn: false });
    expect(stageWrapupOf([task("a", "submitted")])?.detail).toContain("AI が確認中");
    expect(stageWrapupOf([task("a", "instructor-pending")])?.detail).toContain("講師の確認待ち");
  });

  it("受講者の番の課題をレビュー待ちより先に案内し、残りの件数を数える", () => {
    const wrapup = stageWrapupOf([
      task("a", "passed"),
      task("b", "instructor-pending"),
      task("c", "not-started"),
    ]);
    expect(wrapup).toMatchObject({ task: { id: "c" }, remaining: 2, learnerTurn: true });
    expect(wrapup?.detail).toContain("あと 2 件");
  });

  it("受講者の番が無ければ、並び順で最初のレビュー待ちを案内する", () => {
    const wrapup = stageWrapupOf([task("a", "submitted"), task("b", "instructor-pending")]);
    expect(wrapup).toMatchObject({ task: { id: "a" }, remaining: 2, learnerTurn: false });
  });
});
