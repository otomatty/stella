import { describe, expect, it, vi } from "vitest";

vi.mock("./auth.js", () => ({ onDidChangeAuth: vi.fn(), onDidChangeAuthSession: vi.fn() }));
vi.mock("vscode", () => ({ commands: { executeCommand: vi.fn() } }));

import { lessonCommand, toLessonNode } from "./tree.js";

describe("課題文レッスン", () => {
  const base = {
    id: "lesson-1",
    stageId: "stage-1",
    title: "最初のページを作る 課題文",
    type: "text" as const,
    completed: false,
  };

  it("課題に取り組むコマンドにし、状態を添える", () => {
    const node = toLessonNode({
      ...base,
      task: { id: "dev-env-basics/u02-first-task/q01-first-page", status: "not-started" },
    });
    expect(node.contextValue).toBe("lesson-task");
    expect(lessonCommand(node)).toEqual({
      command: "stella.openTask",
      title: "課題に取り組む",
      arguments: ["dev-env-basics/u02-first-task/q01-first-page"],
    });
    expect(node.task?.status).toBe("not-started");
  });

  it("問題レッスンは課題 ID と問題 ID で開く", () => {
    const problem = { taskId: "devlab-ts-ch01/u01-let-const/q01", id: "q01-04-average3" };
    const node = toLessonNode({ ...base, id: `problem-u01-let-const-q01-${problem.id}`, problem });
    expect(node.contextValue).toBe("lesson-problem");
    expect(lessonCommand(node)).toEqual({
      command: "stella.openTask",
      title: "問題に取り組む",
      arguments: [problem.taskId, problem.id],
    });
  });

  it.each(["text", "slides"] as const)("課題の無い %s のレッスンは Web で開く", (type) => {
    const node = toLessonNode({ ...base, type });
    expect(node.contextValue).toBe("lesson-web");
    expect(lessonCommand(node)).toEqual({
      command: "stella.openInWeb",
      title: "Web で開く",
      arguments: [base.stageId, base.id],
    });
  });
});
