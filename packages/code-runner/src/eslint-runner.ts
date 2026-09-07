/**
 * ESLint をブラウザ内で実行するためのラッパ。
 *
 * `eslint-linter-browserify` の Linter API を使用する。
 * (eslint v9 系の Linter は Node.js依存があるが、 browserify版はブラウザでそのまま動く)
 */

import { Linter } from "eslint-linter-browserify";

import type { ESLintRuleConfig, LintViolation } from "@stella/shared/types";

interface RawMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
}

export interface LintCodeOptions {
  ignoredUnusedNames?: string[];
}

/**
 * ESLint Linter シングルトン。 ESLint 設定教材ランナー (#111) からも再利用する。
 * `eslint-linter-browserify` は内部状態を持たないので 1 インスタンスを共有して問題ない。
 */
export const linter = new Linter();

/**
 * 採点時に「定義済み識別子」 とみなす browser/JS グローバル群。
 * eslint-config-runner からも `languageOptions.globals` として再利用される (#111)。
 */
export const GLOBALS: Record<string, "readonly"> = {
  Array: "readonly",
  BigInt: "readonly",
  Boolean: "readonly",
  Date: "readonly",
  Error: "readonly",
  Infinity: "readonly",
  Intl: "readonly",
  JSON: "readonly",
  Map: "readonly",
  Math: "readonly",
  NaN: "readonly",
  Number: "readonly",
  Object: "readonly",
  Promise: "readonly",
  RangeError: "readonly",
  RegExp: "readonly",
  Set: "readonly",
  String: "readonly",
  Symbol: "readonly",
  TypeError: "readonly",
  WeakMap: "readonly",
  WeakSet: "readonly",
  console: "readonly",
  decodeURI: "readonly",
  encodeURI: "readonly",
  isFinite: "readonly",
  isNaN: "readonly",
  parseFloat: "readonly",
  parseInt: "readonly",
  undefined: "readonly",
};

/** ESLint メッセージの日本語訳 (主要ルールのみ) */
const JA_MESSAGES: Record<string, (msg: string) => string> = {
  eqeqeq: () => "== ではなく === を使いましょう",
  "no-var": () => "var ではなく let / const を使いましょう",
  "prefer-const": () => "再代入されない変数は let ではなく const にできます",
  "no-unused-vars": (msg) => `未使用の変数があります: ${msg.match(/'([^']+)'/)?.[1] ?? ""}`,
  "no-undef": (msg) => `未定義の識別子です: ${msg.match(/'([^']+)'/)?.[1] ?? ""}`,
};

export function lintCode(
  code: string,
  rules: Record<string, ESLintRuleConfig>,
  options: LintCodeOptions = {},
): LintViolation[] {
  const ignoredUnusedNames = new Set(options.ignoredUnusedNames ?? []);
  const configuredRules = withUnusedVarsOptions(rules, ignoredUnusedNames);

  let messages: RawMessage[];
  try {
    messages = linter.verify(code, {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "script",
        globals: GLOBALS,
      },
      rules: configuredRules as never,
    });
  } catch {
    return [];
  }

  return messages
    .filter((m) => {
      if (m.ruleId !== "no-unused-vars") {
        return true;
      }
      const unusedName = m.message.match(/'([^']+)'/)?.[1];
      return !unusedName || !ignoredUnusedNames.has(unusedName);
    })
    .map((m) => ({
      ruleId: m.ruleId,
      severity: m.severity,
      message: m.ruleId ? (JA_MESSAGES[m.ruleId]?.(m.message) ?? m.message) : m.message,
      rawMessage: m.message,
      line: m.line,
      column: m.column,
    }));
}

function withUnusedVarsOptions(
  rules: Record<string, ESLintRuleConfig>,
  ignoredUnusedNames: Set<string>,
): Record<string, unknown> {
  const configuredRules: Record<string, unknown> = { ...rules };
  const noUnusedVars = rules["no-unused-vars"];
  if (noUnusedVars === undefined || noUnusedVars === "off" || noUnusedVars === 0) {
    return configuredRules;
  }

  const severity = Array.isArray(noUnusedVars) ? noUnusedVars[0] : noUnusedVars;
  const existingOptions =
    Array.isArray(noUnusedVars) && isRecord(noUnusedVars[1]) ? noUnusedVars[1] : {};
  const rest =
    Array.isArray(noUnusedVars) && isRecord(noUnusedVars[1]) ? noUnusedVars.slice(2) : [];
  const ignoredNamePattern =
    ignoredUnusedNames.size > 0
      ? `^(?:${[...ignoredUnusedNames].map(escapeRegExp).join("|")})$`
      : undefined;

  configuredRules["no-unused-vars"] = [
    severity,
    {
      ...existingOptions,
      args: "none",
      ...(ignoredNamePattern ? { varsIgnorePattern: ignoredNamePattern } : {}),
    },
    ...rest,
  ];

  return configuredRules;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
