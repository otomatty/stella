import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05RangeCheck: Assignment = {
  id: "S2-Ch05-13-range-check",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 13,
  title: "範囲チェックを && で書く",
  newConcept: "1 ≤ x ≤ 100 のような範囲は && で 2 つの条件をつなぐ",
  estimatedMinutes: 7,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const score = 75;\` が **0 以上 100 以下** の範囲にあるかを判定し、 範囲内なら \`"範囲内"\`、 そうでなければ \`"範囲外"\` を出力してください。

数学のように \`0 <= score <= 100\` とは書けません。 \`score >= 0 && score <= 100\` のように \`&&\` で結びます。

## 期待する出力

\`\`\`
範囲内
\`\`\`

## ポイント

- JavaScript は \`a <= x <= b\` の書き方をサポートしません。
- 2 つの条件を \`&&\` で結びます。
`,
  starterFiles: singleFile(`// スコアの数値を const の変数に入れる


// 0 以上 100 以下を && で AND 結合した条件の if / else で、
// 範囲内 / 範囲外それぞれの文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 範囲内 になる",
      expectedStdout: "範囲内",
    },
  ],
  hints: [
    "範囲チェックは `score >= 0 && score <= 100` のように 2 つの条件を `&&` で結びます。",
    "`if/else` で出力を分岐します。",
    "解答例:\n```js\nconst score = 75;\nif (score >= 0 && score <= 100) {\n  console.log(\"範囲内\");\n} else {\n  console.log(\"範囲外\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "LogicalExpression", label: "&& で範囲を表現する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const score = 75;
if (score >= 0 && score <= 100) {
  console.log("範囲内");
} else {
  console.log("範囲外");
}
`,
  badSolutions: [
    {
      code: `console.log("範囲内");
`,
      description: "条件を書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "論理 AND (&&)", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_AND", pageTitle: "論理 AND (&&)" },
  ],
};
