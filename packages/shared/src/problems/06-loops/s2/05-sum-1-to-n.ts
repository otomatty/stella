import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06Sum1ToN: Assignment = {
  id: "S2-Ch06-05-sum-1-to-n",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 5,
  title: "for で 1 から 10 までの合計を求める",
  newConcept: "ループ内で累積値を更新するパターン",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`1\` から \`10\` までの合計を for ループで計算し、 結果を出力してください。

## 期待する出力

\`\`\`
55
\`\`\`

## ポイント

- ループの外で \`let total = 0;\` のように累積用変数を準備します。
- ループの中で \`total += i\` を繰り返します。
- 最後にループの外で \`total\` を出力します。
`,
  starterFiles: singleFile(`// 合計を入れる let の変数を 0 で初期化する


// for ループで 1 から上限まで回し、 += で値を足し込む


// 合計を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 55 になる",
      expectedStdout: "55",
    },
  ],
  hints: [
    "累積用の `let total = 0;` を for の外で宣言します。",
    "ループの中で `total += i;` を繰り返し、 ループ後に `console.log(total);`。",
    "解答例:\n```js\nlet total = 0;\nfor (let i = 1; i <= 10; i++) {\n  total += i;\n}\nconsole.log(total);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 55 }, label: "計算せず答えを直接出力しない" },
      ],
    },
  },
  solution: `let total = 0;
for (let i = 1; i <= 10; i++) {
  total += i;
}
console.log(total);
`,
  badSolutions: [
    {
      code: `console.log(55);
`,
      description: "ループを使わず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
