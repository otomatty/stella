import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseTutorialBlocks } from "../../shared/src/markdown/tutorial-blocks.js";
import { allowsOsBlocks } from "./os-blocks-check.js";

export interface TutorialDiagnostic {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warning";
}
export function checkTutorialSource(
  file: string,
  source: string,
  allowed: boolean,
  scenarioIds: ReadonlySet<string>,
  recordedIds: ReadonlySet<string>,
): TutorialDiagnostic[] {
  const { segments, issues } = parseTutorialBlocks(source);
  const diagnostics: TutorialDiagnostic[] = issues.map((issue) => ({
    file,
    ...issue,
    severity: "error",
  }));
  for (const s of segments) {
    if (s.kind !== "tutorial") continue;
    const error = !allowed
      ? "動画の指定はまとめ (doc.md) と課題文 (README.md) にだけ書けます"
      : !scenarioIds.has(s.id)
        ? `存在しない動画の id です: ${s.id}`
        : null;
    if (error) diagnostics.push({ file, line: s.line, message: error, severity: "error" });
    else if (!recordedIds.has(s.id))
      diagnostics.push({
        file,
        line: s.line,
        message: `動画は未収録です: ${s.id}`,
        severity: "warning",
      });
  }
  return diagnostics;
}
export function checkTutorialBlocks(
  stagesRoot: string,
  scenariosRoot: string,
  manifestPath: string,
): TutorialDiagnostic[] {
  const scenarioIds = new Set<string>();
  for (const name of readdirSync(scenariosRoot).filter((s) => s.endsWith(".ts"))) {
    const source = readFileSync(join(scenariosRoot, name), "utf8");
    const id = /\bid\s*:\s*["']([a-z0-9]+(?:-[a-z0-9]+)*)["']/.exec(source)?.[1];
    if (id) scenarioIds.add(id);
  }
  const recordedIds = new Set<string>();
  if (existsSync(manifestPath)) {
    const data: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (
      typeof data === "object" &&
      data !== null &&
      "tutorials" in data &&
      Array.isArray(data.tutorials)
    ) {
      for (const row of data.tutorials)
        if (row && typeof row.id === "string" && row.draft !== true) recordedIds.add(row.id);
    }
  }
  const diagnostics: TutorialDiagnostic[] = [];
  function walk(dir: string, modules: string) {
    for (const name of readdirSync(dir)) {
      if (["node_modules", ".git"].includes(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, modules);
      else if (/\.(md|json)$/i.test(name))
        diagnostics.push(
          ...checkTutorialSource(
            relative(stagesRoot, full).replaceAll("\\", "/"),
            readFileSync(full, "utf8"),
            allowsOsBlocks(relative(modules, full).replaceAll("\\", "/")),
            scenarioIds,
            recordedIds,
          ),
        );
    }
  }
  for (const slug of readdirSync(stagesRoot)) {
    const modules = join(stagesRoot, slug, "modules");
    if (existsSync(modules) && statSync(modules).isDirectory()) walk(modules, modules);
  }
  return diagnostics;
}
