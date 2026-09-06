import type { Assignment } from "@falcon/shared/types";
import { DISPLAY_NAME } from "@falcon/shared/brand/display";
import * as vscode from "vscode";
import {
  isGradeErrorMessage,
  isGradeResultMessage,
  isGraderReadyMessage,
  type ExecutionResult,
  type GradeRequest,
} from "./grader-protocol.js";

export type { ExecutionResult } from "./grader-protocol.js";

const VIEW_TYPE = "falcon.grader";
const GRADE_TIMEOUT_MS = 60_000;
const READY_TIMEOUT_MS = 15_000;

export interface GradeFilesInput {
  assignment: Assignment;
  files: Record<string, string>;
}

interface PendingGrade {
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GraderHost {
  private panel: vscode.WebviewPanel | undefined;
  private ready = false;
  private readyWaiters: Array<() => void> = [];
  private readonly pending = new Map<string, PendingGrade>();
  private nextRequestId = 1;

  constructor(private readonly extensionUri: vscode.Uri) {}

  async gradeFiles(input: GradeFilesInput): Promise<ExecutionResult> {
    const webview = await this.ensureReady();
    const requestId = `grade-${this.nextRequestId++}`;
    const message: GradeRequest = {
      type: "grade",
      requestId,
      assignment: input.assignment,
      files: input.files,
    };

    return new Promise<ExecutionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("採点がタイムアウトしました"));
      }, GRADE_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, reject, timer });
      void webview.postMessage(message);
    });
  }

  dispose(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("grader disposed"));
    }
    this.pending.clear();
    this.panel?.dispose();
    this.panel = undefined;
  }

  private async ensureReady(): Promise<vscode.Webview> {
    if (!this.panel) {
      this.panel = this.createPanel();
    }
    // Reuse the existing panel. Do not reveal — that would steal the editor.
    if (this.ready) {
      return this.panel.webview;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("grader WebView の起動に失敗しました"));
      }, READY_TIMEOUT_MS);
      this.readyWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    return this.panel.webview;
  }

  private createPanel(): vscode.WebviewPanel {
    this.ready = false;
    const distRoot = vscode.Uri.joinPath(this.extensionUri, "dist");
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      `${DISPLAY_NAME} Grader`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [distRoot],
      },
    );
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(distRoot, "grader.js"));
    const csp = [
      `default-src 'none'`,
      `script-src ${panel.webview.cspSource} 'unsafe-eval' 'wasm-unsafe-eval'`,
      `worker-src ${panel.webview.cspSource} blob:`,
      `style-src 'unsafe-inline'`,
      `connect-src ${panel.webview.cspSource}`,
    ].join("; ");
    // Listen before html so the first `ready` post is not dropped.
    panel.webview.onDidReceiveMessage((raw: unknown) => {
      this.onMessage(raw);
    });
    panel.onDidDispose(() => {
      this.panel = undefined;
      this.ready = false;
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("grader WebView が閉じられました"));
      }
      this.pending.clear();
    });
    panel.webview.html = graderHtml(scriptUri.toString(), csp);
    return panel;
  }

  private onMessage(raw: unknown): void {
    if (isGraderReadyMessage(raw)) {
      this.ready = true;
      const waiters = this.readyWaiters;
      this.readyWaiters = [];
      for (const waiter of waiters) {
        waiter();
      }
      return;
    }
    if (isGradeResultMessage(raw)) {
      const pending = this.pending.get(raw.requestId);
      if (!pending) {
        return;
      }
      this.pending.delete(raw.requestId);
      clearTimeout(pending.timer);
      pending.resolve(raw.result);
      return;
    }
    if (isGradeErrorMessage(raw)) {
      const pending = this.pending.get(raw.requestId);
      if (!pending) {
        return;
      }
      this.pending.delete(raw.requestId);
      clearTimeout(pending.timer);
      pending.reject(new Error(raw.message));
    }
  }
}

export function graderHtml(scriptSrc: string, csp: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
  </head>
  <body>
    <script type="module" src="${scriptSrc}"></script>
  </body>
</html>
`;
}

let host: GraderHost | undefined;

export function initGraderHost(extensionUri: vscode.Uri): GraderHost {
  host = new GraderHost(extensionUri);
  return host;
}

export function getGraderHost(): GraderHost {
  if (!host) {
    throw new Error("GraderHost is not initialized");
  }
  return host;
}

export function gradeFiles(input: GradeFilesInput): Promise<ExecutionResult> {
  return getGraderHost().gradeFiles(input);
}
