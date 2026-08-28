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

import { catalogErrorPlaceholder } from "./tree.js";

describe("catalogErrorPlaceholder", () => {
  it("shows a catalog-error node that can refresh", () => {
    expect(catalogErrorPlaceholder("ステージの読み込みに失敗しました")).toEqual({
      kind: "placeholder",
      id: "falcon.catalog-error",
      title: "ステージの読み込みに失敗しました",
      command: "falcon.refresh",
    });
  });
});
