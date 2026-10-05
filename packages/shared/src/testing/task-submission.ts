import type { TaskBundle } from "../tasks/catalog.js";
import type { TaskManifest } from "../tasks/manifest.js";
import { contentHash, type TaskSubmissionInput } from "../tasks/submission.js";

export async function submissionFixture(manifestOverride: Partial<TaskManifest> = {}) {
  const manifest: TaskManifest = {
    schemaVersion: 1,
    id: "dev-env-basics/u01/page",
    title: "ページを作る",
    kind: "basic",
    runner: "static-preview",
    submit: { files: ["index.html"] },
    protected: ["tests/config.json"],
    checks: { lint: false, format: false },
    static: { checks: [{ type: "html-document", path: "index.html" }] },
    ...manifestOverride,
  };
  const manifestText = JSON.stringify(manifest, null, 2);
  const source = "<!doctype html><html><head><title>課題</title></head><body>hello</body></html>\n";
  const test = '{"ok":true}\n';
  const bytes = new TextEncoder();
  const files = [
    {
      path: "index.html",
      sha256: await contentHash(bytes.encode(source)),
      bytes: bytes.encode(source).length,
    },
  ];
  const protectedFiles = [
    {
      path: "tests/config.json",
      sha256: await contentHash(bytes.encode(test)),
      bytes: bytes.encode(test).length,
    },
  ];
  const bundle: TaskBundle = {
    manifest,
    contentHash: "a".repeat(64),
    files: {
      "index.html": Buffer.from(source).toString("base64"),
      "tests/config.json": Buffer.from(test).toString("base64"),
      "README.md": Buffer.from("# 提出時の課題文").toString("base64"),
      ".stella/task.json": Buffer.from(manifestText).toString("base64"),
    },
  };
  const input: TaskSubmissionInput = {
    taskId: manifest.id,
    contentHash: bundle.contentHash,
    mode: "submit",
    files: [{ path: "index.html", content: bundle.files["index.html"] }],
    explanation: "見出しを配置しました",
    support: [],
    protected: protectedFiles,
    localResult: {
      schemaVersion: 1,
      taskId: manifest.id,
      runner: manifest.runner,
      outcome: "passed",
      startedAt: "2026-10-05T00:00:00Z",
      durationMs: 10,
      platform: "linux",
      toolVersions: {},
      steps: [
        { id: "static", label: "HTML の確認", status: "passed", durationMs: 10, summary: "通過" },
        { id: "files", label: "ファイル", status: "passed", durationMs: 0, summary: "通過" },
      ],
      files,
      protected: protectedFiles,
      manifestSha256: await contentHash(bytes.encode(manifestText)),
    },
  };
  return { bundle, input, source, manifestText, test };
}
