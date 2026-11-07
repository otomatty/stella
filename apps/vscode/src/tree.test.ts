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
    markdown: "# 最初のページを作る",
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

  it("課題の無いテキストのレッスンは今までどおりドキュメントを開く", () => {
    const node = toLessonNode(base);
    expect(node.contextValue).toBe("lesson-doc");
    expect(lessonCommand(node).command).toBe("stella.openLessonDoc");
  });
});
