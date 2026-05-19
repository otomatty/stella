import type {
  ASTCheckResult,
  ASTNodeType,
  ASTPattern,
} from "@falcon/shared/types";

import type { FriendlyMessage } from "./lint-messages";

export function describeRequiredAstCheck(
  check: ASTCheckResult,
): FriendlyMessage {
  return {
    title: check.label,
    description: check.found
      ? "この課題で練習してほしい書き方が使えています。"
      : "この課題で練習してほしい書き方がまだ見つかっていません。",
    hint: check.found ? undefined : hintForRequiredPattern(check.pattern),
  };
}

export function describeForbiddenAstPattern(
  pattern: ASTPattern,
  label: string,
): FriendlyMessage {
  return {
    title: label,
    description: "この課題では、別の書き方を練習するために避けたい書き方です。",
    hint: hintForForbiddenPattern(pattern),
  };
}

function hintForRequiredPattern(pattern: ASTPattern): string {
  switch (pattern.kind) {
    case "method":
      return `配列や値に対して \`.${pattern.name}(...)` + "` を呼び出す形を探してみましょう。";
    case "node":
      return hintForNode(pattern.nodeType, "required");
    case "console-log":
      return "`console.log(...)` の丸かっこの中に、課題で指定された値や式を入れてみましょう。";
    case "const-declaration":
      return pattern.name
        ? `\`const ${pattern.name} = ...\` の形で値を名前付きで保持してみましょう。`
        : "`const` で値を名前付きで保持してみましょう。";
    case "var":
      return "`var` 宣言が必要な課題です。変数宣言の書き方を確認してみましょう。";
    case "loose-eq":
      return "`==` または `!=` を使う比較が必要な課題です。";
    case "async-fn":
      return "`async function` または `async () => ...` の形で関数を書いてみましょう。";
    default: {
      const exhaustive: never = pattern;
      return exhaustive;
    }
  }
}

function hintForForbiddenPattern(pattern: ASTPattern): string {
  switch (pattern.kind) {
    case "method":
      return `今回は \`.${pattern.name}(...)` + "` 以外の方法で書いてみましょう。";
    case "node":
      return hintForNode(pattern.nodeType, "forbidden");
    case "console-log":
      return "`console.log(...)` の呼び出し方を、課題で指定された形に合わせてみましょう。";
    case "const-declaration":
      return "`const` 宣言ではなく、課題で指定された別の書き方を使いましょう。";
    case "var":
      return "`var` ではなく、再代入しないなら `const`、再代入するなら `let` を使いましょう。";
    case "loose-eq":
      return "`==` / `!=` ではなく、`===` / `!==` を使いましょう。";
    case "async-fn":
      return "今回は非同期関数ではなく、通常の関数として書いてみましょう。";
    default: {
      const exhaustive: never = pattern;
      return exhaustive;
    }
  }
}

function hintForNode(nodeType: ASTNodeType, mode: "required" | "forbidden"): string {
  const required = mode === "required";

  switch (nodeType) {
    case "ForStatement":
      return required
        ? "`for (let i = 0; ...)` の形で繰り返してみましょう。"
        : "インデックス付きの `for` 文ではなく、課題で指定された繰り返し方を使いましょう。";
    case "ForInStatement":
      return required
        ? "`for...in` でオブジェクトのキーを順番に取り出してみましょう。"
        : "`for...in` 以外の方法で、必要な値を取り出してみましょう。";
    case "ForOfStatement":
      return required
        ? "`for...of` で配列の値を1つずつ取り出してみましょう。"
        : "`for...of` ではなく、課題で指定された別の方法を使いましょう。";
    case "WhileStatement":
    case "DoWhileStatement":
      return required
        ? "`while` を使って、条件が成り立つ間だけ処理を繰り返してみましょう。"
        : "`while` 系のループは終了条件を間違えやすいため、今回は別の書き方を使いましょう。";
    case "SwitchStatement":
      return required
        ? "`switch` で値ごとの分岐を書いてみましょう。"
        : "`switch` ではなく、`if` やオブジェクトを使った分岐を検討しましょう。";
    case "TryStatement":
      return required
        ? "`try...catch` で失敗する可能性のある処理を囲みましょう。"
        : "今回は `try...catch` に頼らず、事前チェックで処理を書いてみましょう。";
    case "ThrowStatement":
      return required
        ? "`throw` でエラーを明示的に投げる処理を書いてみましょう。"
        : "今回は `throw` せず、戻り値で失敗を表現しましょう。";
    case "VariableDeclaration":
      return required
        ? "`const` や `let` で必要な値を名前付きで保持してみましょう。"
        : "不要な変数を作らず、式や戻り値を整理してみましょう。";
    case "FunctionDeclaration":
      return required
        ? "`function name(...) { ... }` の形で関数を宣言してみましょう。"
        : "今回は関数宣言ではなく、課題で指定された形に合わせましょう。";
    case "FunctionExpression":
      return required
        ? "`const fn = function (...) { ... }` の形を使ってみましょう。"
        : "今回は `function` 式ではなく、別の関数の書き方を使いましょう。";
    case "ArrowFunctionExpression":
      return required
        ? "`const fn = (...) => ...` の形でアロー関数を書いてみましょう。"
        : "今回はアロー関数ではなく、課題で指定された関数の形を使いましょう。";
    case "ClassDeclaration":
    case "ClassExpression":
      return required
        ? "`class` を使って、データと処理をまとめてみましょう。"
        : "今回は `class` ではなく、関数やオブジェクトで表現してみましょう。";
    case "ClassPrivateProperty":
    case "PrivateName":
      return required
        ? "`#name` のような private フィールドを使ってみましょう。"
        : "今回は private フィールドを使わず、公開プロパティやローカル変数で考えましょう。";
    case "TemplateLiteral":
      return required
        ? "バッククォートのテンプレート文字列で値を埋め込んでみましょう。"
        : "今回はテンプレート文字列ではなく、文字列結合など指定された方法を使いましょう。";
    case "ConditionalExpression":
      return required
        ? "`条件 ? A : B` の形で短い分岐を書いてみましょう。"
        : "三項演算子ではなく、`if` など読みやすい分岐に直してみましょう。";
    case "LogicalExpression":
      return required
        ? "`&&` や `||` を使って条件を組み合わせてみましょう。"
        : "`&&` / `||` に頼りすぎず、条件を分けて書いてみましょう。";
    case "BinaryExpression":
      return required
        ? "`+` や `-` などの二項演算子で計算式を組み立ててみましょう。"
        : "今回は計算式ではなく、計算済みの値や別の方法で書いてみましょう。";
    case "NewExpression":
      return required
        ? "`new` を使ってインスタンスを作ってみましょう。"
        : "今回は `new` せず、関数やリテラルで値を作ってみましょう。";
    case "RegExpLiteral":
      return required
        ? "`/.../` の形で正規表現を書いてみましょう。"
        : "今回は正規表現ではなく、文字列メソッドなどで考えてみましょう。";
    case "AwaitExpression":
      return required
        ? "`await` で Promise の結果を待ってから処理しましょう。"
        : "今回は `await` を使わず、同期的な処理として書いてみましょう。";
    case "MemberExpression":
      return required
        ? "`object.property` の形でプロパティを参照してみましょう。"
        : "今回はプロパティ参照に頼らない形に整理してみましょう。";
    case "SpreadElement":
      return required
        ? "`...value` で配列やオブジェクトを展開してみましょう。"
        : "今回はスプレッド構文を使わず、必要な値を明示的に扱いましょう。";
    case "RestElement":
      return required
        ? "`...rest` で残りの値をまとめて受け取りましょう。"
        : "今回は rest 構文を使わず、引数や配列を個別に扱いましょう。";
    case "ObjectPattern":
      return required
        ? "`const { name } = object` の形でオブジェクトを分割代入してみましょう。"
        : "今回はオブジェクトの分割代入を使わず、プロパティを直接参照しましょう。";
    case "ArrayPattern":
      return required
        ? "`const [first] = array` の形で配列を分割代入してみましょう。"
        : "今回は配列の分割代入を使わず、インデックス参照などで書いてみましょう。";
    case "IfStatement":
      return required
        ? "`if (条件) { ... }` で条件分岐を入れてみましょう。"
        : "今回は if 文を使わず、別の書き方を考えてみましょう。";
    case "BreakStatement":
      return required
        ? "`break;` でループを途中で抜けてみましょう。"
        : "今回は break を使わず、ループの条件式だけで終了させましょう。";
    case "ContinueStatement":
      return required
        ? "`continue;` で今の反復をスキップしてみましょう。"
        : "今回は continue を使わず、条件式の組み立てで対処してみましょう。";
    case "ReturnStatement":
      return required
        ? "`return 値;` で関数から値を返してみましょう。"
        : "今回は return を使わない処理として書いてみましょう。";
    default: {
      const exhaustive: never = nodeType;
      return exhaustive;
    }
  }
}
