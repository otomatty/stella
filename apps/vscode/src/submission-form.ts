import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { onDidChangeAuthSession } from "./auth.js";
import { sideColumn } from "./task-panel.js";
import {
  initialSubmissionDraft,
  parseSubmissionDraft,
  renderSubmissionForm,
  submissionDraftProblem,
  type SubmissionDraft,
  type SubmissionFormInput,
} from "./submission-form-view.js";

interface SubmissionFormActions {
  save: (draft: SubmissionDraft) => Promise<void>;
  submit: (draft: SubmissionDraft) => Promise<void>;
}

let extensionUri: vscode.Uri | undefined;
const panels = new Map<string, { panel: vscode.WebviewPanel; mode: SubmissionFormInput["mode"] }>();

function closeForms(): void {
  for (const { panel } of panels.values()) panel.dispose();
  panels.clear();
}

export function registerSubmissionForms(context: vscode.ExtensionContext): void {
  extensionUri = context.extensionUri;
  context.subscriptions.push(onDidChangeAuthSession(closeForms), { dispose: closeForms });
}

export function showSubmissionForm(
  input: SubmissionFormInput,
  actions: SubmissionFormActions,
): void {
  const existing = panels.get(input.key);
  if (existing?.mode === input.mode) {
    existing.panel.reveal(sideColumn());
    return;
  }
  existing?.panel.dispose();
  if (!extensionUri)
    throw new Error("提出画面を準備できませんでした。VS Code を読み込み直してください");
  const mediaRoot = vscode.Uri.joinPath(extensionUri, "media");
  const panel = vscode.window.createWebviewPanel(
    "stella.submissionForm",
    `${input.mode === "consult" ? "相談" : "提出"}: ${input.title}`,
    sideColumn(),
    {
      enableScripts: true,
      localResourceRoots: [mediaRoot],
    },
  );
  panels.set(input.key, { panel, mode: input.mode });
  const nonce = randomBytes(18).toString("hex");
  const resource = (name: string) =>
    panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, name)).toString();
  let draft = initialSubmissionDraft(input);
  let closed = false;
  let busy = false;
  let submitted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saves: Promise<void> = Promise.resolve();
  const post = (message: Record<string, unknown>) => {
    if (!closed) void panel.webview.postMessage(message);
  };
  const save = () => {
    const snapshot = draft;
    saves = saves.catch(() => undefined).then(() => actions.save(snapshot));
    return saves;
  };
  const messages = panel.webview.onDidReceiveMessage((raw: unknown) => {
    if (
      closed ||
      busy ||
      !raw ||
      typeof raw !== "object" ||
      !("token" in raw) ||
      raw.token !== nonce ||
      !("action" in raw) ||
      !["change", "save", "submit"].includes(String(raw.action))
    )
      return;
    void (async () => {
      try {
        draft = parseSubmissionDraft("draft" in raw ? raw.draft : undefined, Boolean(input.debug));
        if (timer) clearTimeout(timer);
        if (raw.action === "change") {
          timer = setTimeout(() => {
            void save().then(
              () => post({ kind: "saved" }),
              (error: unknown) =>
                post({
                  kind: "error",
                  message: error instanceof Error ? error.message : String(error),
                }),
            );
          }, 600);
          return;
        }
        if (raw.action === "submit") {
          const problem = submissionDraftProblem(draft, input);
          if (problem) throw new Error(problem);
          busy = true;
          post({ kind: "busy" });
        }
        await save();
        if (closed) return;
        if (raw.action === "save") post({ kind: "saved" });
        else {
          await actions.submit(draft);
          submitted = true;
          panel.dispose();
        }
      } catch (error) {
        post({ kind: "error", message: error instanceof Error ? error.message : String(error) });
      } finally {
        busy = false;
        post({ kind: "idle" });
      }
    })();
  });
  const disposal = panel.onDidDispose(() => {
    closed = true;
    if (timer) clearTimeout(timer);
    if (!submitted) void save().catch(() => undefined);
    messages.dispose();
    disposal.dispose();
    if (panels.get(input.key)?.panel === panel) panels.delete(input.key);
  });
  panel.webview.html = renderSubmissionForm(input, draft, {
    nonce,
    cspSource: panel.webview.cspSource,
    styleUri: resource("submission-form.css"),
    scriptUri: resource("submission-form.js"),
  });
}
