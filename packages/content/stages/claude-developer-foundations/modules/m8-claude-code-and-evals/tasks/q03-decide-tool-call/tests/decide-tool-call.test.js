import { expect, it, vi } from "vitest";
import { decideToolCall } from "../src/decide-tool-call.js";

const bash = (command) => ({ tool: "Bash", input: { command } });
const edit = (file_path) => ({ tool: "Edit", input: { file_path } });
const config = (overrides) => ({
  hooks: [],
  deny: [],
  ask: [],
  allow: [],
  mode: "default",
  ...overrides,
});
const hook = (matcher, decision) => ({ matcher, run: vi.fn(() => decision) });

it("細かい許可はツール全体の拒否より後に判定する", () => {
  expect(
    decideToolCall(
      bash("npm test"),
      config({
        deny: ["Bash"],
        allow: ["Bash(npm test)"],
      }),
    ),
  ).toEqual({ decision: "deny", decidedBy: "deny-rule" });
});

it("フックの許可があっても拒否ルールを適用する", () => {
  const call = bash("npm run publish-preview");
  const approve = hook("Bash", "allow");
  const canUseTool = vi.fn();
  expect(
    decideToolCall(
      call,
      config({
        hooks: [approve],
        deny: ["Bash(npm run publish-*)"],
        canUseTool,
      }),
    ),
  ).toEqual({ decision: "deny", decidedBy: "deny-rule" });
  expect(approve.run).toHaveBeenCalledWith(call);
  expect(canUseTool).not.toHaveBeenCalled();
});

it("bypassPermissions でも拒否ルールが有効", () => {
  expect(
    decideToolCall(
      edit("reports/2026/weekly.md"),
      config({
        deny: ["Edit(reports/**)"],
        mode: "bypassPermissions",
      }),
    ),
  ).toEqual({ decision: "deny", decidedBy: "deny-rule" });
});

it("フックを順に調べ、bypassPermissions でも後続のフックの拒否で止める", () => {
  const skipped = hook("NotebookEdit", "deny");
  const approve = hook("Write|Edit", "allow");
  const reject = hook("Edit", "deny");
  const later = hook("Edit", undefined);
  const call = edit("reports/a.md");

  expect(
    decideToolCall(
      call,
      config({
        hooks: [skipped, approve, reject, later],
        mode: "bypassPermissions",
      }),
    ),
  ).toEqual({ decision: "deny", decidedBy: "hook" });
  expect(skipped.run).not.toHaveBeenCalled();
  expect(approve.run).toHaveBeenCalledWith(call);
  expect(approve.run).toHaveBeenCalledBefore(reject.run);
  expect(later.run).not.toHaveBeenCalled();
});

it.each([
  ["block", { decision: "deny", decidedBy: "hook-failure" }],
  [undefined, { decision: "allow", decidedBy: "allow-rule" }],
])("フックの例外は onFailure に従う (%s)", (onFailure, expected) => {
  const run = vi.fn(() => {
    throw new Error("設定を読めません");
  });
  expect(
    decideToolCall(
      bash("npm test"),
      config({
        hooks: [{ matcher: "Bash", run, onFailure }],
        allow: ["Bash(npm test)"],
      }),
    ),
  ).toEqual(expected);
  expect(run).toHaveBeenCalledTimes(1);
});

it("確認ルールはフックの許可やモードの許可より先に決まる", () => {
  const canUseTool = vi.fn();
  expect(
    decideToolCall(
      bash("npm test"),
      config({
        hooks: [hook("Bash", "allow")],
        ask: ["Bash"],
        mode: "bypassPermissions",
        canUseTool,
      }),
    ),
  ).toEqual({ decision: "ask", decidedBy: "ask-rule" });
  expect(canUseTool).not.toHaveBeenCalled();
});

it("フックの確認は別のフックの許可やモードの許可より先に決まる", () => {
  expect(
    decideToolCall(
      edit("reports/a.md"),
      config({
        hooks: [hook("Edit", "ask"), hook("Edit", "allow")],
        mode: "acceptEdits",
      }),
    ),
  ).toEqual({ decision: "ask", decidedBy: "hook" });
});

it.each([
  [bash("npm test"), { mode: "bypassPermissions" }, "mode"],
  [edit("reports/a.md"), { mode: "acceptEdits" }, "mode"],
  [
    { tool: "Write", input: { file_path: "reports/a.md" } },
    { mode: "acceptEdits" },
    "mode",
  ],
  [
    bash("npm test"),
    { allow: ["Bash(npm test)"], mode: "dontAsk" },
    "allow-rule",
  ],
  [edit("reports/a.md"), { hooks: [hook("Edit", "allow")] }, "hook"],
])("自動許可では canUseTool に届かない (%j)", (call, overrides, decidedBy) => {
  const canUseTool = vi.fn(() => "deny");
  expect(decideToolCall(call, config({ ...overrides, canUseTool }))).toEqual({
    decision: "allow",
    decidedBy,
  });
  expect(canUseTool).not.toHaveBeenCalled();
});

it("dontAsk では許可のない呼び出しを拒否する", () => {
  expect(
    decideToolCall(
      bash("npm run lint"),
      config({
        allow: ["Bash(npm test)"],
        mode: "dontAsk",
      }),
    ),
  ).toEqual({ decision: "deny", decidedBy: "mode" });
});

it("acceptEdits で Bash を自動許可しない", () => {
  expect(
    decideToolCall(bash("npm test"), config({ mode: "acceptEdits" })),
  ).toEqual({
    decision: "ask",
    decidedBy: "mode",
  });
});

it.each([
  ["default", "deny"],
  ["dontAsk", "allow"],
])(
  "判定が残ったときはモードが %s でも canUseTool の結果を返す",
  (mode, decision) => {
    const call = bash("npm test");
    const canUseTool = vi.fn(() => decision);
    expect(decideToolCall(call, config({ mode, canUseTool }))).toEqual({
      decision,
      decidedBy: "canUseTool",
    });
    expect(canUseTool).toHaveBeenCalledExactlyOnceWith(call);
  },
);

it.each([
  ["reports/a+.md", "allow"],
  ["reports/archive/a+.md", "allow"],
  ["reports/archive/aa.md", "ask"],
  ["tmp/reports/a+.md", "ask"],
  ["reports/a+.md.bak", "ask"],
])(
  "パス全体を照合し、ワイルドカード以外は文字どおり扱う (%s)",
  (path, decision) => {
    expect(
      decideToolCall(
        edit(path),
        config({
          allow: ["Edit(reports/*a+.md)"],
        }),
      ).decision,
    ).toBe(decision);
  },
);
