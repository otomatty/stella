import path from "node:path";
import type { RunResult, TestCaseResult } from "@stella/shared/tasks/run-result";
import * as vscode from "vscode";
import { findTestLine } from "./find-test-line.js";
import { readFileInRoot } from "./runner/files.js";
import { onDidFinishTaskCheck } from "./task-run-events.js";
import { shortStepLabel } from "./task-run-summary.js";
import { expectedActual } from "./task-test-message.js";

const MAX_DIAGNOSTICS = 300;
const MAX_TEST_DIAGNOSTICS = 50;
const MAX_TEST_FILE_BYTES = 512 * 1024;
const FORMAT_MESSAGE =
  "整形が必要です。保存時の整形か「ドキュメントのフォーマット」で直してください";

function isWithinRoot(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function resolveDiagnosticFile(root: string, file: string): string | undefined {
  if (!file || file.includes("\0") || path.isAbsolute(file) || path.win32.isAbsolute(file)) {
    return undefined;
  }
  const resolved = path.resolve(root, file);
  return isWithinRoot(root, resolved) ? resolved : undefined;
}

function positionIndex(value: number): number {
  return Number.isInteger(value) && value >= 1 ? value - 1 : 0;
}

function testMessage({ name, message }: TestCaseResult): string {
  const comparison = message ? expectedActual(message) : undefined;
  const detail = comparison
    ? `期待 ${comparison.expected} / 実際 ${comparison.actual}`
    : message?.split(/\r\n?|\n/, 1)[0];
  return Array.from(detail ? `${name}: ${detail}` : name)
    .slice(0, 300)
    .join("");
}

async function collectDiagnostics(
  root: string,
  result: RunResult,
): Promise<Map<string, vscode.Diagnostic[]>> {
  const byFile = new Map<string, vscode.Diagnostic[]>();
  if (result.outcome === "passed") return byFile;

  const testSources = new Map<string, string>();
  let total = 0;
  let testCount = 0;
  for (const step of result.steps) {
    const source = `STELLA (${shortStepLabel(step.label)})`;
    const add = (file: string, diagnostic: vscode.Diagnostic) => {
      diagnostic.source = source;
      const existing = byFile.get(file);
      if (existing) existing.push(diagnostic);
      else byFile.set(file, [diagnostic]);
      total++;
    };

    for (const finding of step.lint ?? []) {
      if (total >= MAX_DIAGNOSTICS) return byFile;
      const file = resolveDiagnosticFile(root, finding.file);
      if (!file) continue;
      const line = positionIndex(finding.line);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(line, positionIndex(finding.column), line, Number.MAX_SAFE_INTEGER),
        finding.message,
        finding.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning,
      );
      if (finding.ruleId !== null) diagnostic.code = finding.ruleId;
      add(file, diagnostic);
    }

    if (step.id === "format" && step.status === "failed") {
      for (const name of step.files ?? []) {
        if (total >= MAX_DIAGNOSTICS) return byFile;
        const file = resolveDiagnosticFile(root, name);
        if (!file) continue;
        add(
          file,
          new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 0),
            FORMAT_MESSAGE,
            vscode.DiagnosticSeverity.Warning,
          ),
        );
      }
    }

    for (const test of step.tests ?? []) {
      if (total >= MAX_DIAGNOSTICS) return byFile;
      if (testCount >= MAX_TEST_DIAGNOSTICS) break;
      if (test.status !== "failed" || !test.file) continue;
      const file = resolveDiagnosticFile(root, test.file);
      if (!file) continue;
      let testSource = testSources.get(file);
      if (testSource === undefined) {
        testSource = await readFileInRoot(root, path.relative(root, file), MAX_TEST_FILE_BYTES)
          .then((bytes) => bytes.toString("utf8"))
          .catch(() => "");
        testSources.set(file, testSource);
      }
      const line = findTestLine(testSource, test.name);
      const range =
        line === undefined
          ? new vscode.Range(0, 0, 0, 0)
          : new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
      add(file, new vscode.Diagnostic(range, testMessage(test), vscode.DiagnosticSeverity.Error));
      testCount++;
    }
  }
  return byFile;
}

export function registerTaskDiagnostics(context: vscode.ExtensionContext): void {
  let collection: vscode.DiagnosticCollection | undefined;
  const pending = new Map<string, Set<string>>();

  context.subscriptions.push(
    { dispose: () => pending.clear() },
    onDidFinishTaskCheck(async ({ root, result, saved }) => {
      if (!saved || result.outcome === "cancelled") return;
      if (!collection) {
        const diagnostics = vscode.languages.createDiagnosticCollection("stella");
        context.subscriptions.push(
          diagnostics,
          vscode.workspace.onDidChangeTextDocument(({ document: { uri }, contentChanges }) => {
            if (contentChanges.length === 0 || uri.scheme !== "file") return;
            if (diagnostics.has(uri)) diagnostics.delete(uri);
            for (const [root, edited] of pending) {
              if (isWithinRoot(root, uri.fsPath)) edited.add(uri.fsPath);
            }
          }),
        );
        collection = diagnostics;
      }

      const taskRoot = path.resolve(root);
      const edited = new Set<string>();
      pending.set(taskRoot, edited);
      const byFile = await collectDiagnostics(taskRoot, result);
      // ファイルを読んでいる間に、新しい結果や編集が届くことがある。
      if (pending.get(taskRoot) !== edited) return;
      pending.delete(taskRoot);

      const entries = new Map<string, [vscode.Uri, vscode.Diagnostic[] | undefined]>();
      collection.forEach((uri) => {
        if (isWithinRoot(taskRoot, uri.fsPath)) entries.set(uri.fsPath, [uri, undefined]);
      });
      for (const [file, diagnostics] of byFile) {
        if (!edited.has(file)) entries.set(file, [vscode.Uri.file(file), diagnostics]);
      }
      collection.set([...entries.values()]);
    }),
  );
}
