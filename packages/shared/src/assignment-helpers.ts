import type {
  Assignment,
  AssignmentFile,
  ASTRequirement,
  ESLintRuleConfig,
  Language,
} from "./types.js";
import { getDefaultLintPreset, LINT_PRESET_RULES } from "./lint-presets.js";

export interface StaticAnalysisSettings {
  eslintRules: Record<string, ESLintRuleConfig>;
  ast: ASTRequirement;
  ignoredUnusedNames: string[];
}

export function getStaticAnalysisSettings(assignment: Assignment): StaticAnalysisSettings {
  const lintPreset = assignment.lintPreset ?? getDefaultLintPreset(assignment.stage);

  return {
    eslintRules: {
      ...LINT_PRESET_RULES[lintPreset],
      ...(assignment.staticAnalysis?.eslint?.rules ?? {}),
    },
    ast: assignment.staticAnalysis?.ast ?? {},
    ignoredUnusedNames: assignment.entryPoints ?? [],
  };
}

/** 言語が未指定なら "javascript" を返す。 */
export function getLanguage(assignment: Assignment): Language {
  return assignment.language ?? "javascript";
}

function defaultEntryPathFor(lang: Language): string {
  switch (lang) {
    case "sql":
      return "query.sql";
    case "typescript":
      return "main.ts";
    case "fe-pseudo":
      return "main.fe";
    case "javascript":
      return "main.js";
    default: {
      const _exhaustive: never = lang;
      void _exhaustive;
      return "main.js";
    }
  }
}

/**
 * 多ファイル UI / 採点で使う starterFiles を取り出す。
 */
export function getStarterFiles(assignment: Assignment): AssignmentFile[] {
  return assignment.starterFiles;
}

/**
 * 採点・実行の入口ファイルパスを取り出す。
 * 明示の `entryFile` → `starterFiles[0].path` の順で解決する。
 */
export function getEntryFile(assignment: Assignment): string {
  if (assignment.entryFile) {
    return assignment.entryFile;
  }
  return assignment.starterFiles[0]?.path ?? defaultEntryPathFor(getLanguage(assignment));
}
