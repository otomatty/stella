import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  EventEmitter: class {
    event = () => undefined;
    fire(): void {
      return;
    }
  },
  TreeItem: class {
    constructor(public readonly label: string) {}
  },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ThemeIcon: class {
    constructor(public readonly id: string) {}
  },
  window: {
    registerTreeDataProvider: () => ({
      dispose(): void {
        return;
      },
    }),
  },
  commands: { executeCommand: () => undefined },
}));

import type { AuthStore } from "./auth.js";
import {
  catalogErrorPlaceholder,
  LessonTreeProvider,
  lessonCommand,
  toLessonNode,
} from "./tree.js";

describe("catalogErrorPlaceholder", () => {
  it("shows a catalog-error node that can refresh", () => {
    expect(catalogErrorPlaceholder("ステージの読み込みに失敗しました")).toEqual({
      kind: "placeholder",
      id: "stella.catalog-error",
      title: "ステージの読み込みに失敗しました",
      command: "stella.refresh",
    });
  });
});

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
      task: { id: "dev-env-basics/m0-first-page/q01-first-page", status: "not-started" },
    });
    expect(node.contextValue).toBe("lesson-task");
    expect(lessonCommand(node)).toEqual({
      command: "stella.openTask",
      title: "課題に取り組む",
      arguments: ["dev-env-basics/m0-first-page/q01-first-page"],
    });
    const item = new LessonTreeProvider({} as AuthStore).getTreeItem(node) as unknown as {
      description: string;
      iconPath: { id: string };
    };
    expect(item.description).toBe("未着手");
    expect(item.iconPath.id).toBe("edit");
    const passed = new LessonTreeProvider({} as AuthStore).getTreeItem(
      toLessonNode({ ...base, task: { id: "x/y/z", status: "ai-passed" } }),
    ) as unknown as { iconPath: { id: string } };
    expect(passed.iconPath.id).toBe("pass");
  });

  it("課題の無いテキストのレッスンは今までどおりドキュメントを開く", () => {
    const node = toLessonNode(base);
    expect(node.contextValue).toBe("lesson-doc");
    expect(lessonCommand(node).command).toBe("stella.openLessonDoc");
  });
});
