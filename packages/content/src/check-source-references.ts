import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readEnvironment } from "./task-content.js";
import {
  object,
  publicContentFiles,
  readSourceRefs,
  readSourceRegistry,
  readUnitReferences,
  type SourceRecord,
  type UnitReferences,
} from "./source-references.js";

export interface SourceDiagnostic {
  unitId: string;
  severity: "error" | "warning";
  message: string;
}
export interface LegacySourceBaseline {
  schemaVersion: 1;
  baseCommit: string;
  units: Record<string, string>;
  /** 誤字・表記・レイアウトだけの差分は人が確認し、理由を記録する。 */
  exemptions: {
    unitId: string;
    contentHash: string;
    reason: string;
    reviewer: string;
    reviewedAt: string;
  }[];
}

/** 内容と環境の変更を検出。前提・parent や参照元の追記だけでは改訂にならない。 */
export function unitContentHash(directory: string, environment?: string): string {
  const hash = createHash("sha256").update(environment ?? "");
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (["node_modules", ".git"].includes(entry) || entry === "references.json") continue;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`単元にシンボリックリンクは使えません: ${rel}`);
      if (stat.isDirectory()) walk(path, rel);
      else if (/\.(md|json|html|svg|png|webp|jpg|ts|js|css)$/.test(entry)) {
        hash.update(`${rel}\0`);
        if (entry.endsWith(".md")) {
          let content = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
          content = content.replace(/^---\n([\s\S]*?)\n---\n/, (_whole, head: string) => {
            const fields = head
              .split("\n")
              .filter((line) => !/^sourceRefs:/.test(line))
              .join("\n")
              .trim();
            return fields ? `---\n${fields}\n---\n` : "";
          });
          hash.update(content);
        } else hash.update(readFileSync(path));
      }
    }
  }
  walk(directory, "");
  return hash.digest("hex");
}
export function listSourceUnits(
  root: string,
): { unitId: string; directory: string; format: number; environment?: string }[] {
  const units: { unitId: string; directory: string; format: number; environment?: string }[] = [];
  for (const slug of readdirSync(join(root, "courses")).sort()) {
    const course = join(root, "courses", slug);
    if (!existsSync(join(course, "course.json")) || !existsSync(join(course, "modules"))) continue;
    const config = object(
      JSON.parse(readFileSync(join(course, "course.json"), "utf8")),
      "course.json",
    );
    for (const unit of readdirSync(join(course, "modules")).sort()) {
      const directory = join(course, "modules", unit);
      if (!lstatSync(directory).isDirectory()) continue;
      units.push({
        unitId: `${slug}/${unit}`,
        directory,
        format: Number(config.format ?? 1),
        ...(typeof config.environment === "string" ? { environment: config.environment } : {}),
      });
    }
  }
  return units;
}
export function createLegacyBaseline(root: string, baseCommit: string): LegacySourceBaseline {
  return {
    schemaVersion: 1,
    baseCommit,
    units: Object.fromEntries(
      listSourceUnits(root)
        .filter((u) => u.format !== 2)
        .map((u) => [u.unitId, unitContentHash(u.directory, u.environment)]),
    ),
    exemptions: [],
  };
}
export function isTechnologyLandingPage(source: Pick<SourceRecord, "url">): boolean {
  const url = new URL(source.url);
  if (url.hash) return false;
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  return (
    !path ||
    /\/(docs|guide|learn|reference|api|handbook|curriculum|multipage)$/.test(path) ||
    /\/docs\/web\/(html|css|javascript)(\/guide)?$/.test(path)
  );
}
function checkUnit(
  root: string,
  unitId: string,
  directory: string,
  refs: UnitReferences | undefined,
  registry: Map<string, SourceRecord>,
  environment?: string,
): string[] {
  const problems: string[] = [];
  if (!refs) return ["references.json がありません"];
  if (refs.unitId.split("@")[0] !== unitId)
    problems.push(`unitId が単元と一致しません: ${refs.unitId}`);
  const envParts = /^([a-z0-9][a-z0-9._-]*)@([^@]+)$/.exec(refs.environmentRef);
  if (!envParts) problems.push("environmentRef: ID@version の環境定義が必要です");
  else {
    try {
      const env = readEnvironment(root, envParts[1]);
      if (env.id !== refs.environmentRef)
        problems.push(`環境の版が一致しません: ${refs.environmentRef}`);
      if (environment && environment !== envParts[1])
        problems.push("講座・課題と参照元の環境が一致しません");
    } catch (error) {
      problems.push(`環境の定義がありません: ${String(error)}`);
    }
  }
  const files = publicContentFiles(directory);
  for (const use of refs.uses) {
    if (!files.includes(use.contentId)) problems.push(`参照の対応先がありません: ${use.contentId}`);
    if (use.reviewStatus !== "approved")
      problems.push(`${use.contentId}: レビュー状態が approved ではありません`);
    for (const id of use.sourceRefs) {
      const source = registry.get(id);
      if (!source) {
        problems.push(`${use.contentId}: 未登録の sourceRef: ${id}`);
        continue;
      }
      if (source.review.status !== "approved")
        problems.push(`${id}: レビュー状態が approved ではありません`);
      if (isTechnologyLandingPage(source))
        problems.push(`${id}: 技術のトップページだけを根拠にできません`);
    }
  }
  for (const file of files) {
    const uses = refs.uses.filter((u) => u.contentId === file);
    if (uses.length === 0) {
      problems.push(`${file}: 参照元または独自制作の記録がありません`);
      continue;
    }
    let declared: string[] | undefined;
    try {
      if (file.startsWith("tasks/") && file.endsWith("/README.md")) {
        const task = object(
          JSON.parse(
            readFileSync(join(directory, file.replace(/README\.md$/, "task.json")), "utf8"),
          ),
          "task.json",
        );
        if (typeof task.environment !== "string" || (envParts && task.environment !== envParts[1]))
          problems.push(`${file}: 課題と参照元の環境が一致しません`);
        if (Array.isArray(task.sources) && task.sources.every((id) => typeof id === "string"))
          declared = task.sources as string[];
      } else if (file.endsWith(".md"))
        declared = readSourceRefs(readFileSync(join(directory, file), "utf8"));
    } catch (error) {
      problems.push(`${file}: ${String(error)}`);
    }
    if (file.endsWith(".md")) {
      if (!declared) problems.push(`${file}: sourceRefs (課題は sources) がありません`);
      else {
        const mapped = [...new Set(uses.flatMap((u) => u.sourceRefs))].sort();
        if (JSON.stringify([...declared].sort()) !== JSON.stringify(mapped))
          problems.push(`${file}: sourceRefs と references.json の対応が一致しません`);
        for (const id of declared)
          if (!registry.has(id)) problems.push(`${file}: 未登録の sourceRef: ${id}`);
      }
    }
  }
  return [...new Set(problems)];
}
export function checkSourceReferences(
  root: string,
  baseline?: LegacySourceBaseline,
): SourceDiagnostic[] {
  const registry = readSourceRegistry(root);
  const recorded =
    baseline ??
    (JSON.parse(
      readFileSync(join(root, "sources/legacy-units.json"), "utf8"),
    ) as LegacySourceBaseline);
  if (recorded.schemaVersion !== 1 || !recorded.units || !Array.isArray(recorded.exemptions))
    throw new Error("旧単元の基準記録が不正です");
  const diagnostics: SourceDiagnostic[] = [];
  for (const unit of listSourceUnits(root)) {
    const hash = unitContentHash(unit.directory, unit.environment);
    const exempt = recorded.exemptions.some(
      (e) =>
        e.unitId === unit.unitId &&
        e.contentHash === hash &&
        e.reason.trim() &&
        e.reviewer.trim() &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.reviewedAt),
    );
    const required = unit.format === 2 || (recorded.units[unit.unitId] !== hash && !exempt);
    try {
      const refs = readUnitReferences(unit.directory);
      for (const message of checkUnit(
        root,
        unit.unitId,
        unit.directory,
        refs,
        registry,
        unit.environment,
      ))
        diagnostics.push({
          unitId: unit.unitId,
          severity: required ? "error" : "warning",
          message,
        });
    } catch (error) {
      diagnostics.push({
        unitId: unit.unitId,
        severity: required ? "error" : "warning",
        message: String(error),
      });
    }
  }
  return diagnostics;
}
