import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05ElseIfGrade: Assignment = {
  id: "S2-Ch05-03-else-if-grade",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 3,
  title: "else if で 3 段階の成績判定",
  newConcept: "else if で複数の条件を順に試す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const score = 75;\` に対して、 以下の判定で結果を出力してください。

- 80 以上: \`"A"\`
- 60 以上 80 未満: \`"B"\`
- それ未満: \`"C"\`

## 期待する出力

\`\`\`
B
\`\`\`

## ポイント

- \`if (条件1) { ... } else if (条件2) { ... } else { ... }\` の形で 3 つ以上の分岐を書けます。
- 条件は **上から順に評価** され、 最初に真になったブロックだけが実行されます。
`,
  starterFiles: singleFile(`// スコアの数値を const の変数に入れる


// if / else if / else で 3 段階に分岐し、 各範囲に対応する文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が B になる",
      expectedStdout: "B",
    },
  ],
  hints: [
    "`score >= 80` を最初の条件、 `score >= 60` を else if、 残りを else に。",
    "上の条件が真なら下は評価されないので、 順序が大事。",
    "解答例:\n```js\nconst score = 75;\nif (score >= 80) {\n  console.log(\"A\");\n} else if (score >= 60) {\n  console.log(\"B\");\n} else {\n  console.log(\"C\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const score = 75;
if (score >= 80) {
  console.log("A");
} else if (score >= 60) {
  console.log("B");
} else {
  console.log("C");
}
`,
  badSolutions: [
    {
      code: `console.log("B");
`,
      description: "条件分岐を書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "if...else", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/if...else", pageTitle: "if...else" },
  ],
};
