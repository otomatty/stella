import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05IfElseEvenOdd: Assignment = {
  id: "S2-Ch05-02-if-else-even-odd",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 2,
  title: "if/else で偶数か奇数か判定する",
  newConcept: "% 2 で偶奇を判定し、 if/else で分岐する",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const n = 7;\` に対して、 \`n\` が **偶数なら** \`"even"\`、 **奇数なら** \`"odd"\` を出力してください。

\`if/else\` を使います。

## 期待する出力

\`\`\`
odd
\`\`\`

## ポイント

- 偶数判定は \`n % 2 === 0\`。
- \`if (条件) { ... } else { ... }\` の形で偽の場合の処理を書きます。
`,
  starterFiles: singleFile(`// 数値を const の変数に入れる


// 2 で割った余り (% 演算子) で if / else に分岐し、 それぞれの場合の文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が odd になる",
      expectedStdout: "odd",
    },
  ],
  hints: [
    "`n % 2 === 0` で偶数かどうかを判定します。",
    "`if/else` の中括弧の中にそれぞれの場合の処理を書きます。",
    "解答例:\n```js\nconst n = 7;\nif (n % 2 === 0) {\n  console.log(\"even\");\n} else {\n  console.log(\"odd\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != は使わず === / !== を使う" },
      ],
    },
  },
  solution: `const n = 7;
if (n % 2 === 0) {
  console.log("even");
} else {
  console.log("odd");
}
`,
  badSolutions: [
    {
      code: `console.log("odd");
`,
      description: "if/else を使わず結果を直接出力している",
    },
    {
      code: `const n = 7;
if (n % 2 == 0) {
  console.log("even");
} else {
  console.log("odd");
}
`,
      description: "== (緩い等価) を使っている (S2 では === に統一)",
    },
  ],
  mdnSections: [
    { heading: "if...else", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/if...else", pageTitle: "if...else" },
  ],
};
