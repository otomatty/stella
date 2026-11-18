import path from "node:path";
import type { RunResult, TestCaseResult } from "@stella/shared/tasks/run-result";
import * as vscode from "vscode";
import { findTestLine } from "./find-test-line.js";
import { loadTask } from "./runner/run-task.js";
import { readTestSource, resolveDiagnosticFile } from "./task-diagnostics.js";
import { readLastResult } from "./task-guide.js";
import { onDidFinishTaskCheck } from "./task-run-events.js";
import { onDidChangeTaskState } from "./task-state.js";
import { expectedActual } from "./task-test-message.js";

const MAX_TESTS = 500;

// Testing API で予約されている NUL を避け、ID の構成要素をそのまま区別する。
function itemId(root: string, file: string, name?: string): string {
  return JSON.stringify(name === undefined ? [root, file] : [root, file, name]);
}

interface TestEntry {
  test: TestCaseResult;
  range?: vscode.Range;
}

interface TestGroup {
  file?: string;
  cases: Map<string, TestEntry>;
}

async function collectTests(root: string, result: RunResult, existing?: vscode.TestItem) {
  const groups = new Map<string, TestGroup>();
  let count = 0;
  existing?.children.forEach((child) => {
    count += child.children.size || 1;
  });
  for (const step of result.steps) {
    for (const test of step.tests ?? []) {
      const name = test.file ?? "";
      const file = resolveDiagnosticFile(root, name);
      const groupId = file ? itemId(root, name) : "";
      const parent = file ? existing?.children.get(groupId) : existing;
      const id = itemId(root, name, test.name);
      let group = groups.get(groupId);
      if (!group?.cases.has(id) && !parent?.children.get(id)) {
        if (count >= MAX_TESTS) continue;
        count++;
      }
      if (!group) {
        group = { file, cases: new Map() };
        groups.set(groupId, group);
      }
      group.cases.set(id, { test });
    }
  }

  for (const { file, cases } of groups.values()) {
    if (!file) continue;
    const source = await readTestSource(root, file);
    const lines = source.split(/\r\n?|\n/);
    for (const entry of cases.values()) {
      const line = findTestLine(source, entry.test.name);
      if (line !== undefined) entry.range = new vscode.Range(line, 0, line, lines[line].length);
    }
  }
  return groups;
}

function updateItems(
  controller: vscode.TestController,
  root: string,
  title: string,
  groups: Map<string, TestGroup>,
  partial: boolean,
) {
  const task = controller.items.get(root) ?? controller.createTestItem(root, title);
  task.label = title;
  const updated = new Set<string>();
  const cases = new Map<vscode.TestItem, TestCaseResult>();
  for (const [groupId, { file, cases: entries }] of groups) {
    const uri = file ? vscode.Uri.file(file) : undefined;
    let parent = task;
    if (file) {
      parent =
        task.children.get(groupId) ?? controller.createTestItem(groupId, path.basename(file), uri);
      task.children.add(parent);
      updated.add(groupId);
    }
    for (const [id, { test, range }] of entries) {
      const names = test.name.split(" › ");
      const label = names.pop() ?? test.name;
      const item = parent.children.get(id) ?? controller.createTestItem(id, label, uri);
      item.description = names.join(" › ") || undefined;
      item.range = range;
      parent.children.add(item);
      updated.add(id);
      cases.set(item, test);
    }
  }
  if (!partial) {
    task.children.forEach((child) => {
      if (!updated.has(child.id)) task.children.delete(child.id);
      else {
        child.children.forEach((item) => {
          if (!updated.has(item.id)) child.children.delete(item.id);
        });
      }
    });
  }
  controller.items.add(task);
  return { task, cases };
}

function failureMessage(item: vscode.TestItem, test: TestCaseResult): vscode.TestMessage {
  const text = test.message || "このテストは通りませんでした";
  const comparison = expectedActual(text);
  const message = comparison
    ? vscode.TestMessage.diff(text.split(/\r\n?|\n/, 1)[0], comparison.expected, comparison.actual)
    : new vscode.TestMessage(text);
  if (item.uri && item.range) message.location = new vscode.Location(item.uri, item.range);
  return message;
}

function hasTests(result: RunResult): boolean {
  return result.outcome !== "cancelled" && result.steps.some((step) => step.tests !== undefined);
}

export function registerTaskTests(context: vscode.ExtensionContext): void {
  let controller: vscode.TestController | undefined;
  const inWorkspace = (root: string) =>
    Boolean(vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root)));
  const pending = new Map<string, { tail: Promise<void> }>();

  function getController(): vscode.TestController {
    if (controller) return controller;
    const tests = vscode.tests.createTestController("stella.tasks", "STELLA の課題");
    const profile = tests.createRunProfile(
      "課題を確認する",
      vscode.TestRunProfileKind.Run,
      async (request) => {
        const roots = new Set<string>();
        if (request.include) {
          for (let item of request.include) {
            while (item.parent) item = item.parent;
            if (tests.items.get(item.id) === item) roots.add(item.id);
          }
        } else if (tests.items.size === 1) {
          tests.items.forEach((item) => {
            roots.add(item.id);
          });
        } else if (tests.items.size > 1) {
          void vscode.window.showInformationMessage(
            "確認する課題を、テストビューで選んでから実行してください",
          );
        }
        for (const root of roots) await vscode.commands.executeCommand("stella.runTask", root);
      },
      true,
    );
    context.subscriptions.push(
      profile,
      tests,
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        for (const root of pending.keys()) {
          if (!inWorkspace(root)) pending.delete(root);
        }
        tests.items.forEach((item) => {
          if (!inWorkspace(item.id)) tests.items.delete(item.id);
        });
      }),
    );
    controller = tests;
    return tests;
  }

  // 同じ課題の復元と確認結果は順に適用し、ワークスペースから外れた課題の読み込みは打ち切る。
  async function enqueue(
    root: string,
    update: (tests: vscode.TestController, active: () => boolean) => Promise<void>,
  ) {
    if (!inWorkspace(root)) return;
    const tests = getController();
    const queue = pending.get(root) ?? { tail: Promise.resolve() };
    pending.set(root, queue);
    const active = () => pending.get(root) === queue;
    const next = queue.tail
      .catch(() => undefined)
      .then(() => (active() ? update(tests, active) : undefined));
    queue.tail = next;
    try {
      await next;
    } finally {
      if (active() && queue.tail === next) pending.delete(root);
    }
  }

  context.subscriptions.push(
    { dispose: () => pending.clear() },
    onDidFinishTaskCheck(({ root, manifest, result, saved }) => {
      if (!saved || !hasTests(result)) return;
      return enqueue(root, async (tests, active) => {
        const partial = result.problemId !== undefined;
        const groups = await collectTests(
          root,
          result,
          partial ? tests.items.get(root) : undefined,
        );
        if (!active()) return;
        const { task, cases } = updateItems(tests, root, manifest.title, groups, partial);
        const run = tests.createTestRun(new vscode.TestRunRequest([task]), "手元の確認", false);
        try {
          for (const [item, test] of cases) {
            if (test.status === "passed") run.passed(item);
            else if (test.status === "skipped") run.skipped(item);
            else if (test.status === "failed") run.failed(item, failureMessage(item, test));
          }
          for (const step of result.steps) {
            run.appendOutput(`${step.label}: ${step.summary}\r\n`);
          }
        } finally {
          run.end();
        }
      });
    }),
    onDidChangeTaskState((root) => {
      if (root === undefined || controller?.items.get(root) || pending.has(root)) return;
      return enqueue(root, async (tests, active) => {
        const loaded = await loadTask(root);
        if (!loaded.ok || !active()) return;
        const result = await readLastResult(root, loaded.manifest.id);
        if (!result || !hasTests(result) || !active()) return;
        const groups = await collectTests(root, result);
        if (active()) updateItems(tests, root, loaded.manifest.title, groups, false);
      });
    }),
  );
}
