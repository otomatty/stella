import { randomBytes } from "node:crypto";
import type { LessonType } from "@stella/shared/cms/types";
import type { TaskStatus } from "@stella/shared/tasks/catalog";
import * as vscode from "vscode";
import { AuthExpiredError } from "./api.js";
import type { AuthStore } from "./auth.js";
import { onDidChangeAuth, onDidChangeAuthSession } from "./auth.js";
import { clearCatalog, loadCatalog, type CatalogStage, type CatalogLesson } from "./catalog.js";
import {
  renderLearningSidebar,
  resolveLearningLocation,
  type LearningSelection,
  type LearningSidebarState,
} from "./learning-sidebar.js";

export type LessonContextValue = "lesson-code" | "lesson-doc" | "lesson-web" | "lesson-task";

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
  /** 新形式の課題の課題文レッスンなら、その課題。開くと課題フォルダーを準備して並べる。 */
  task?: { id: string; status: TaskStatus };
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
    contextValue: lesson.task ? "lesson-task" : contextValueFor(lesson.type),
    completed: lesson.completed,
    ...(lesson.markdown ? { markdown: lesson.markdown } : {}),
    ...(lesson.pdfPath ? { pdfPath: lesson.pdfPath } : {}),
    ...(lesson.assignmentId ? { assignmentId: lesson.assignmentId } : {}),
    ...(lesson.task ? { task: lesson.task } : {}),
  };
}

export function lessonCommand(node: LessonNode): vscode.Command {
  switch (node.contextValue) {
    case "lesson-web":
      return {
        command: "stella.openInWeb",
        title: "Web で開く",
        arguments: [node.stageId, node.id],
      };
    case "lesson-doc":
      return {
        command: "stella.openLessonDoc",
        title: "ドキュメントを開く",
        arguments: [node],
      };
    case "lesson-code":
      return {
        command: "stella.openLessonCode",
        title: "演習を開く",
        arguments: [node],
      };
    case "lesson-task":
      return {
        command: "stella.openTask",
        title: "課題に取り組む",
        arguments: [node.task?.id],
      };
    default: {
      const _exhaustive: never = node.contextValue;
      return _exhaustive;
    }
  }
}

export class LearningSidebarProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private catalog: CatalogStage[] = [];
  private selection: LearningSelection = {};
  private state: LearningSidebarState = { kind: "loading" };
  private loadGeneration = 0;
  private messageToken = "";
  private documentToken = "";
  private webviewReady = false;

  constructor(
    private readonly auth: AuthStore,
    private readonly extensionUri: vscode.Uri,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.documentToken = "";
    this.webviewReady = false;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };
    const messages = view.webview.onDidReceiveMessage((message: unknown) => {
      if (this.view !== view) return;
      void this.receive(message).catch((err: unknown) => {
        void vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
      });
    });
    const visibility = view.onDidChangeVisibility(() => {
      if (view.visible) void this.refresh();
    });
    const disposed = view.onDidDispose(() => {
      messages.dispose();
      visibility.dispose();
      disposed.dispose();
      if (this.view === view) {
        this.view = undefined;
        this.loadGeneration += 1;
      }
    });
    void this.refresh();
  }

  reset(): void {
    this.loadGeneration += 1;
    this.catalog = [];
    this.selection = {};
    this.state = { kind: "loading" };
    this.render();
  }

  reveal(selection: LearningSelection): void {
    this.selection = selection;
    this.render();
  }

  async refresh(): Promise<void> {
    const generation = ++this.loadGeneration;
    if (!this.view?.visible) return;
    this.state = { kind: "loading" };
    this.render();
    try {
      const token = await this.auth.getToken();
      if (generation !== this.loadGeneration) return;
      if (!token) {
        this.catalog = [];
        this.state = { kind: "disconnected" };
      } else {
        const catalog = await loadCatalog();
        if (generation !== this.loadGeneration) return;
        this.catalog = catalog;
        this.state = { kind: "catalog", catalog, selection: this.selection };
      }
    } catch (err) {
      if (generation !== this.loadGeneration) return;
      this.catalog = [];
      this.state =
        err instanceof AuthExpiredError
          ? { kind: "disconnected" }
          : { kind: "error", message: err instanceof Error ? err.message : String(err) };
    }
    this.render();
  }

  private render(): void {
    if (!this.view) return;
    const initial = !this.documentToken;
    if (!initial && !this.webviewReady) return;
    this.messageToken = randomBytes(18).toString("hex");
    const webview = this.view.webview;
    const resource = (name: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", name)).toString();
    if (this.state.kind === "catalog") this.state.selection = this.selection;
    const html = renderLearningSidebar(this.state, {
      nonce: this.messageToken,
      cspSource: webview.cspSource,
      styleUri: resource("learning-sidebar.css"),
      scriptUri: resource("learning-sidebar.js"),
    });
    if (initial) {
      this.documentToken = this.messageToken;
      webview.html = html;
    } else {
      // ライブリージョンを維持し、読み込み開始を既存文書内の変更として通知する。
      void webview.postMessage({ type: "render", html });
    }
  }

  private async receive(raw: unknown): Promise<void> {
    if (!raw || typeof raw !== "object" || !("token" in raw) || !("action" in raw)) return;
    if (raw.action === "ready" && raw.token === this.documentToken) {
      this.webviewReady = true;
      this.render();
      return;
    }
    if (raw.token !== this.messageToken) return;
    // Webview からコマンド名・URL・教材の本文を受け取らない。
    const id = "id" in raw && typeof raw.id === "string" ? raw.id : undefined;
    if (raw.action === "refresh") return this.refresh();
    if (raw.action === "connect") {
      await vscode.commands.executeCommand("stella.connect");
      return;
    }
    if (raw.action === "home") {
      await vscode.commands.executeCommand("stella.openInWeb");
      return;
    }
    if (this.state.kind !== "catalog" || !id) return;
    const { stage } = resolveLearningLocation(this.catalog, this.selection);
    if (raw.action === "stage" && this.catalog.some((item) => item.id === id)) {
      this.reveal({ stageId: id });
    } else if (raw.action === "section" && stage?.sections.some((item) => item.id === id)) {
      this.reveal({ stageId: stage.id, sectionId: id });
    } else if (raw.action === "open" || raw.action === "review") {
      const lesson = stage?.sections.flatMap((item) => item.lessons).find((item) => item.id === id);
      if (!lesson) return;
      this.reveal({ stageId: lesson.stageId, lessonId: lesson.id });
      const cmd =
        raw.action === "review"
          ? { command: "stella.openInWeb", arguments: [lesson.stageId, lesson.id] }
          : lessonCommand(toLessonNode(lesson));
      await vscode.commands.executeCommand(cmd.command, ...(cmd.arguments ?? []));
    }
  }

  dispose(): void {
    this.loadGeneration += 1;
    this.messageToken = "";
    this.documentToken = "";
    this.webviewReady = false;
    this.view = undefined;
    this.catalog = [];
  }
}

let registeredProvider: LearningSidebarProvider | undefined;

export function refreshLearningSidebar(): void {
  void registeredProvider?.refresh();
}

export function openLessonNode(node: LessonNode): void {
  registeredProvider?.reveal({ stageId: node.stageId, lessonId: node.id });
  const cmd = lessonCommand(node);
  void vscode.commands.executeCommand(cmd.command, ...(cmd.arguments ?? []));
}

export function registerLearningSidebar(
  context: vscode.ExtensionContext,
  auth: AuthStore,
): LearningSidebarProvider {
  const provider = new LearningSidebarProvider(auth, context.extensionUri);
  registeredProvider = provider;
  context.subscriptions.push(
    provider,
    vscode.window.registerWebviewViewProvider("stella.lessons", provider),
    vscode.commands.registerCommand("stella.revealTask", (taskId: unknown) => {
      if (typeof taskId === "string") provider.reveal({ taskId });
    }),
    onDidChangeAuthSession(() => {
      clearCatalog();
      provider.reset();
    }),
    onDidChangeAuth(() => {
      clearCatalog();
      void provider.refresh();
    }),
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) refreshLearningSidebar();
    }),
    {
      dispose: () => {
        registeredProvider = undefined;
      },
    },
  );
  return provider;
}
