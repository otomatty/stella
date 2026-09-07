import type { LessonType } from "@stella/shared/cms/types";
import * as vscode from "vscode";
import { AuthExpiredError } from "./api.js";
import type { AuthStore } from "./auth.js";
import { onDidChangeAuth } from "./auth.js";
import {
  clearCatalog,
  loadCatalog,
  type CatalogStage,
  type CatalogLesson,
  type CatalogSection,
} from "./catalog.js";

export type LessonContextValue = "lesson-code" | "lesson-doc" | "lesson-web";

export interface StageNode {
  kind: "stage";
  id: string;
  title: string;
  sections: SectionNode[];
}

export interface SectionNode {
  kind: "section";
  id: string;
  title: string;
  lessons: LessonNode[];
}

export interface LessonNode {
  kind: "lesson";
  id: string;
  stageId: string;
  title: string;
  lessonType: LessonType;
  contextValue: LessonContextValue;
  completed: boolean;
  markdown?: string;
  pdfPath?: string;
  assignmentId?: string;
}

export interface PlaceholderNode {
  kind: "placeholder";
  id: string;
  title: string;
  command?: string;
}

export type TreeNode = StageNode | SectionNode | LessonNode | PlaceholderNode;

const CONNECT_NODE: PlaceholderNode = {
  kind: "placeholder",
  id: "falcon.connect",
  title: "Web で接続",
  command: "falcon.connect",
};

export function catalogErrorPlaceholder(message: string): PlaceholderNode {
  return {
    kind: "placeholder",
    id: "falcon.catalog-error",
    title: message,
    command: "falcon.refresh",
  };
}

function contextValueFor(type: LessonType): LessonContextValue {
  switch (type) {
    case "code":
      return "lesson-code";
    case "text":
    case "slides":
      return "lesson-doc";
    case "video":
    case "quiz":
    case "assignment":
      return "lesson-web";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function toLessonNode(lesson: CatalogLesson): LessonNode {
  return {
    kind: "lesson",
    id: lesson.id,
    stageId: lesson.stageId,
    title: lesson.title,
    lessonType: lesson.type,
    contextValue: contextValueFor(lesson.type),
    completed: lesson.completed,
    ...(lesson.markdown ? { markdown: lesson.markdown } : {}),
    ...(lesson.pdfPath ? { pdfPath: lesson.pdfPath } : {}),
    ...(lesson.assignmentId ? { assignmentId: lesson.assignmentId } : {}),
  };
}

function toSectionNode(section: CatalogSection): SectionNode {
  return {
    kind: "section",
    id: section.id,
    title: section.title,
    lessons: section.lessons.map(toLessonNode),
  };
}

function toStageNode(stage: CatalogStage): StageNode {
  return {
    kind: "stage",
    id: stage.id,
    title: stage.title,
    sections: stage.sections.map(toSectionNode),
  };
}

export function lessonCommand(node: LessonNode): vscode.Command {
  switch (node.contextValue) {
    case "lesson-web":
      return {
        command: "falcon.openInWeb",
        title: "Web で開く",
        arguments: [node.stageId, node.id],
      };
    case "lesson-doc":
      return {
        command: "falcon.openLessonDoc",
        title: "ドキュメントを開く",
        arguments: [node],
      };
    case "lesson-code":
      return {
        command: "falcon.openLessonCode",
        title: "演習を開く",
        arguments: [node],
      };
    default: {
      const _exhaustive: never = node.contextValue;
      return _exhaustive;
    }
  }
}

export class LessonTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly didChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this.didChange.event;
  private loadGeneration = 0;

  constructor(private readonly auth: AuthStore) {}

  refresh(): void {
    this.loadGeneration += 1;
    this.didChange.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    switch (element.kind) {
      case "stage": {
        const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `stage:${element.id}`;
        item.contextValue = "stage";
        item.iconPath = new vscode.ThemeIcon("book");
        return item;
      }
      case "section": {
        const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `section:${element.id}`;
        item.contextValue = "section";
        return item;
      }
      case "lesson": {
        const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
        item.id = `lesson:${element.stageId}:${element.id}`;
        item.contextValue = element.contextValue;
        item.iconPath = new vscode.ThemeIcon(element.completed ? "pass" : "circle-outline");
        item.command = lessonCommand(element);
        return item;
      }
      case "placeholder": {
        const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
        item.id = element.id;
        item.contextValue = "placeholder";
        if (element.command) {
          item.command = { command: element.command, title: element.title };
        }
        return item;
      }
      default: {
        const _exhaustive: never = element;
        return _exhaustive;
      }
    }
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      return this.rootNodes();
    }
    switch (element.kind) {
      case "stage":
        return element.sections;
      case "section":
        return element.lessons;
      case "lesson":
      case "placeholder":
        return [];
      default: {
        const _exhaustive: never = element;
        return _exhaustive;
      }
    }
  }

  private async rootNodes(): Promise<TreeNode[]> {
    const generation = this.loadGeneration;
    const token = await this.auth.getToken();
    if (!token) {
      return [CONNECT_NODE];
    }
    try {
      const stages = await loadCatalog();
      if (generation !== this.loadGeneration) {
        return this.rootNodes();
      }
      return stages.map(toStageNode);
    } catch (err) {
      if (generation !== this.loadGeneration) {
        return this.rootNodes();
      }
      if (err instanceof AuthExpiredError) {
        return [CONNECT_NODE];
      }
      const message = err instanceof Error ? err.message : String(err);
      return [catalogErrorPlaceholder(message)];
    }
  }
}

let registeredProvider: LessonTreeProvider | undefined;

export function refreshLessonTree(): void {
  registeredProvider?.refresh();
}

export function openLessonNode(node: LessonNode): void {
  const cmd = lessonCommand(node);
  void vscode.commands.executeCommand(cmd.command, ...(cmd.arguments ?? []));
}

export function registerLessonTree(
  context: vscode.ExtensionContext,
  auth: AuthStore,
): LessonTreeProvider {
  const provider = new LessonTreeProvider(auth);
  registeredProvider = provider;
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("falcon.lessons", provider),
    onDidChangeAuth(() => {
      clearCatalog();
      provider.refresh();
    }),
  );
  return provider;
}
