import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07DefaultArgs: Assignment = {
  id: "S2-Ch07-05-default-args",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 5,
  title: "デフォルト引数で省略可能にする",
  newConcept: "function f(name = 'ゲスト') で引数省略時の既定値を指定",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`function greet(name = "ゲスト")\` のようにデフォルト引数を持つ関数を作り、 以下の **2 通り** で呼び出してください。

1. 引数なしで呼ぶ → \`"こんにちは、 ゲストさん"\`
2. \`"花子"\` を渡して呼ぶ → \`"こんにちは、 花子さん"\`

## 期待する出力

\`\`\`
こんにちは、 ゲストさん
こんにちは、 花子さん
\`\`\`

## ポイント

- デフォルト引数は \`function f(x = 既定値)\` のように書きます。
- 引数を渡さない呼び出しで既定値が使われます。
`,
  starterFiles: singleFile(`// function 文の関数を宣言し、 引数にデフォルト値を = で指定する
// 中ではテンプレートリテラルで挨拶文を組み立てて console.log で出力する


// 引数なしで呼び出す


// 説明文の名前を引数で渡して呼び出す

`),
  tests: [
    {
      name: "stdout がゲスト→花子 の 2 行になる",
      expectedStdout: "こんにちは、 ゲストさん\nこんにちは、 花子さん",
    },
  ],
  hints: [
    "デフォルト引数は宣言の `(name = \"ゲスト\")` 部分で指定します。",
    "関数本体ではテンプレートリテラル `\\`こんにちは、 ${name}さん\\`` を出力します。",
    "解答例:\n```js\nfunction greet(name = \"ゲスト\") {\n  console.log(`こんにちは、 ${name}さん`);\n}\ngreet();\ngreet(\"花子\");\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: "function greet(name = \"ゲスト\") {\n  console.log(`こんにちは、 ${name}さん`);\n}\ngreet();\ngreet(\"花子\");\n",
  badSolutions: [
    {
      code: `console.log("こんにちは、 ゲストさん");
console.log("こんにちは、 花子さん");
`,
      description: "関数を使わず 1 行ずつ出力している",
    },
  ],
  mdnSections: [
    { heading: "デフォルト引数", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Default_parameters", pageTitle: "デフォルト引数" },
  ],
};
