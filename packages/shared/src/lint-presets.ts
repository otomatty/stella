import type {
  ESLintRuleConfig,
  LintPreset,
  Stage,
} from "./types.js";

const BUG_PREVENTION_RULES: Record<string, ESLintRuleConfig> = {
  eqeqeq: "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-redeclare": "error",
  "no-undef": "error",
  "no-unreachable": "error",
  "no-var": "error",
  "prefer-const": "warn",
  "use-isnan": "error",
  "valid-typeof": "error",
};

const CLEANUP_RULES: Record<string, ESLintRuleConfig> = {
  "no-unused-vars": [
    "warn",
    {
      args: "none",
      ignoreRestSiblings: true,
    },
  ],
};

const READABILITY_RULES: Record<string, ESLintRuleConfig> = {
  curly: "warn",
  "no-else-return": "warn",
};

const EXPRESSION_CLARITY_RULES: Record<string, ESLintRuleConfig> = {
  "no-implicit-coercion": "warn",
  "no-nested-ternary": "warn",
};

const MAINTAINABILITY_RULES: Record<string, ESLintRuleConfig> = {
  complexity: ["warn", 5],
  "max-depth": ["warn", 3],
  "max-params": ["warn", 4],
};

export const LINT_PRESET_RULES: Record<
  LintPreset,
  Record<string, ESLintRuleConfig>
> = {
  S1: BUG_PREVENTION_RULES,
  S2: {
    ...BUG_PREVENTION_RULES,
    ...CLEANUP_RULES,
  },
  S3: {
    ...BUG_PREVENTION_RULES,
    ...CLEANUP_RULES,
    ...READABILITY_RULES,
  },
  S4: {
    ...BUG_PREVENTION_RULES,
    ...CLEANUP_RULES,
    ...READABILITY_RULES,
    ...EXPRESSION_CLARITY_RULES,
  },
  S5: {
    ...BUG_PREVENTION_RULES,
    ...CLEANUP_RULES,
    ...READABILITY_RULES,
    ...EXPRESSION_CLARITY_RULES,
    ...MAINTAINABILITY_RULES,
  },
};

export const COMMON_LINT_RULES = LINT_PRESET_RULES.S1;

export function getDefaultLintPreset(stage: Stage): LintPreset {
  switch (stage) {
    case "S0":
    case "S1":
      return "S1";
    case "S2":
      return "S2";
    case "S3":
      return "S3";
    case "S4":
      return "S4";
    case "S5":
      return "S5";
    default: {
      const exhaustive: never = stage;
      throw new Error(`Unknown stage: ${String(exhaustive)}`);
    }
  }
}
