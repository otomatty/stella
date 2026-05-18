/**
 * JavaScript 専用の AST 解析 (Babel)。 **クライアント側のみ** で使用される。
 *
 * 言語別ディスパッチは `./index.ts` の `analyzeAst(language, ...)` を経由する。
 * 直接呼び出しは「JS と分かっている」 場面 (テスト・整合性スクリプト等) のみ。
 *
 * 対応するパターン:
 * - method: `x.NAME(...)` 形式のメソッド呼び出し
 * - node: 特定の構文 (ForStatement, WhileStatement, など)
 * - console-log: `console.log(...)` 呼び出しとその第1引数
 * - const-declaration: `const NAME = ...` 宣言
 * - var: var宣言
 * - loose-eq: == または !=
 */

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { Node } from "@babel/types";

import type {
  ASTConsoleLogArgument,
  ASTPattern,
  ASTRequirement,
  ASTResult,
  ASTCheckResult,
  ASTViolation,
} from "../types.js";

// `@babel/traverse` は default export が `{default: fn}` でラップされる場合がある
// (ESM/CJSの相互運用問題)。両方対応するために fallback する。
const traverseModule = _traverse as typeof _traverse & {
  default?: typeof _traverse;
};
const traverse = traverseModule.default ?? _traverse;

interface Found {
  /** マッチしたNode (最初のもの) の行番号 */
  line: number;
}

/**
 * コード文字列を AST に変換し、要件を満たすかどうかをチェックする。
 */
export function analyzeJsAst(code: string, requirement: ASTRequirement): ASTResult {
  // パース
  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(code, {
      sourceType: "script",
      errorRecovery: true,
      plugins: [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      required: (requirement.required ?? []).map((p) => ({
        pattern: p,
        label: labelOf(p),
        found: false,
      })),
      forbidden: [],
      parseError: msg,
    };
  }

  // 必須/禁止それぞれについて、コード全体をスキャンしてマッチ箇所を集める
  const requiredResults: ASTCheckResult[] = (requirement.required ?? []).map(
    (pattern) => {
      const found = findFirst(ast, pattern);
      return {
        pattern,
        label: labelOf(pattern),
        found: found !== null,
      };
    },
  );

  const forbiddenViolations: ASTViolation[] = [];
  for (const pattern of requirement.forbidden ?? []) {
    const found = findFirst(ast, pattern);
    if (found) {
      forbiddenViolations.push({
        pattern,
        label: labelOf(pattern),
        line: found.line,
      });
    }
  }

  return {
    required: requiredResults,
    forbidden: forbiddenViolations,
  };
}

function labelOf(p: ASTPattern): string {
  if (p.label) {return p.label;}
  switch (p.kind) {
    case "method":
      return `${p.name} を使う`;
    case "node":
      return p.nodeType;
    case "console-log":
      return "console.log を使う";
    case "const-declaration":
      return p.name ? `const ${p.name} を宣言する` : "const 宣言";
    case "var":
      return "var 宣言";
    case "loose-eq":
      return "== / != (緩い等価比較)";
    case "async-fn":
      return "async 関数を使う";
  }
}

/**
 * AST全体をスキャンし、最初にマッチしたNodeの行番号を返す。なければ null。
 */
function findFirst(ast: Node, pattern: ASTPattern): Found | null {
  let result: Found | null = null;

  traverse(ast as never, {
    enter(path) {
      if (result) {return;}

      const node = path.node;
      if (matches(node, pattern)) {
        result = { line: node.loc?.start.line ?? 0 };
        path.stop();
      }
    },
  });

  return result;
}

function matches(node: Node, pattern: ASTPattern): boolean {
  switch (pattern.kind) {
    case "method": {
      // `x.NAME(...)` または `x?.NAME(...)`
      if (node.type !== "CallExpression") {return false;}
      const callee = node.callee;
      if (
        (callee.type === "MemberExpression" ||
          callee.type === "OptionalMemberExpression") &&
        callee.property.type === "Identifier" &&
        callee.property.name === pattern.name
      ) {
        return true;
      }
      return false;
    }

    case "node":
      if (pattern.nodeType === "VariableDeclaration") {
        // `var` 専用パターンと区別する。VariableDeclaration指定時は kind を問わない
        return node.type === "VariableDeclaration";
      }
      return node.type === pattern.nodeType;

    case "console-log":
      return matchesConsoleLog(node, pattern.argument);

    case "const-declaration":
      return matchesConstDeclaration(node, pattern.name);

    case "var":
      return node.type === "VariableDeclaration" && node.kind === "var";

    case "loose-eq":
      return (
        node.type === "BinaryExpression" &&
        (node.operator === "==" || node.operator === "!=")
      );

    case "async-fn":
      return (
        (node.type === "FunctionDeclaration" ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression") &&
        node.async === true
      );
  }
}

function matchesConsoleLog(
  node: Node,
  expectedArgument?: ASTConsoleLogArgument,
): boolean {
  if (node.type !== "CallExpression") {return false;}
  const callee = node.callee;
  if (
    callee.type !== "MemberExpression" &&
    callee.type !== "OptionalMemberExpression"
  ) {
    return false;
  }
  if (callee.object.type !== "Identifier" || callee.object.name !== "console") {
    return false;
  }
  if (callee.property.type !== "Identifier" || callee.property.name !== "log") {
    return false;
  }
  if (!expectedArgument) {return true;}
  return matchesConsoleLogArgument(node.arguments[0], expectedArgument);
}

function matchesConsoleLogArgument(
  argument: Node | undefined,
  expected: ASTConsoleLogArgument,
): boolean {
  if (!argument) {return false;}
  switch (expected.kind) {
    case "number":
      return argument.type === "NumericLiteral" && argument.value === expected.value;
    case "string":
      return argument.type === "StringLiteral" && argument.value === expected.value;
    case "identifier":
      return argument.type === "Identifier" && argument.name === expected.name;
    case "binary":
      return (
        argument.type === "BinaryExpression" &&
        (expected.operator === undefined || argument.operator === expected.operator)
      );
    default: {
      const exhaustive: never = expected;
      return exhaustive;
    }
  }
}

function matchesConstDeclaration(node: Node, name?: string): boolean {
  if (node.type !== "VariableDeclaration" || node.kind !== "const") {
    return false;
  }
  if (!name) {return true;}
  return node.declarations.some(
    (declaration) =>
      declaration.id.type === "Identifier" && declaration.id.name === name,
  );
}
