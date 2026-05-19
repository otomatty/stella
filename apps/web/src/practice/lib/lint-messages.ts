import type { LintViolation } from "@falcon/shared/types";

export interface FriendlyMessage {
  title: string;
  description?: string;
  hint?: string;
}

const LINT_MESSAGES: Record<string, FriendlyMessage> = {
  eqeqeq: {
    title: "比較は `===` / `!==` で書きましょう",
    description:
      "`==` は値を自動変換してから比較するため、思わぬ判定になることがあります。",
    hint: "`a == b` は `a === b`、`a != b` は `a !== b` に直してみましょう。",
  },
  "no-var": {
    title: "`var` を使わないようにしましょう",
    description:
      "`var` は有効範囲が広く、後から値が変わった理由を追いにくくなります。",
    hint: "再代入しないなら `const`、再代入するなら `let` を使いましょう。",
  },
  "prefer-const": {
    title: "変わらない値は `const` にできます",
    description:
      "一度代入した後に変えない変数は、`const` にすると意図が読み取りやすくなります。",
    hint: "その変数に再代入していない場合は、`let` を `const` に変えてみましょう。",
  },
  "no-unused-vars": {
    title: "使っていない変数があります",
    description:
      "使わない変数が残っていると、コードの意図が読み取りにくくなります。",
    hint: "不要なら削除し、使う予定があるなら処理の中で参照しましょう。",
  },
  "no-undef": {
    title: "まだ定義されていない名前を使っています",
    description:
      "JavaScript は事前に用意されていない変数や関数名をそのまま使えません。",
    hint: "スペルミスがないか、先に `const` / `let` / `function` で定義しているか確認しましょう。",
  },
};

export function describeLintViolation(
  violation: LintViolation,
): FriendlyMessage {
  const fallback: FriendlyMessage = {
    title: violation.message,
    hint: violation.rawMessage,
  };

  if (!violation.ruleId) {
    return fallback;
  }

  return LINT_MESSAGES[violation.ruleId] ?? fallback;
}

export function lintSeverityLabel(severity: LintViolation["severity"]): string {
  return severity === 2 ? "エラー" : "ヒント";
}
