import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05DefaultFallback: Assignment = {
  id: "S2-Ch05-14-default-fallback",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 14,
  title: "|| でデフォルト値を与える",
  newConcept: "値が falsy なら別の値にフォールバックする",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const userName = "";\` のとき、 \`userName || "ゲスト"\` を使って **空ならゲスト**、 入っていればその値を出力する仕組みを書いてください。

## 期待する出力

\`\`\`
ゲスト
\`\`\`

## ポイント

- \`A || B\` の評価結果は **A が truthy なら A、 それ以外なら B**。
- 「値が無ければデフォルト」 を 1 行で書ける定番イディオムです。
`,
  starterFiles: singleFile(`// ユーザー名の文字列 (空かもしれない) を const の変数に入れる


// || 演算子でデフォルト値にフォールバックさせた結果を、 別の const の変数に入れる


// 結果の変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が ゲスト になる",
      expectedStdout: "ゲスト",
    },
  ],
  hints: [
    "`userName || \"ゲスト\"` の結果を変数に入れます。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst userName = \"\";\nconst display = userName || \"ゲスト\";\nconsole.log(display);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "LogicalExpression", label: "|| でデフォルト値を表現する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const userName = "";
const display = userName || "ゲスト";
console.log(display);
`,
  badSolutions: [
    {
      code: `console.log("ゲスト");
`,
      description: "|| を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "論理 OR (||)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_OR", pageTitle: "論理 OR (||)" },
  ],
};
