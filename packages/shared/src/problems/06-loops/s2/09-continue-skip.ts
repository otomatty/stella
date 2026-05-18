import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06ContinueSkip: Assignment = {
  id: "S2-Ch06-09-continue-skip",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 9,
  title: "continue で偶数だけスキップする",
  newConcept: "continue は今回の処理だけ飛ばして次のループへ",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`1\` から \`6\` までを for で巡り、 偶数は飛ばして **奇数だけ** を 1 行ずつ出力してください。 \`continue\` を使います。

## 期待する出力

\`\`\`
1
3
5
\`\`\`

## ポイント

- \`continue;\` で今の反復を **スキップして次へ** 進みます。
- 「除外する条件を満たしたら continue」 のパターンが定番です。
`,
  starterFiles: singleFile(`// for ループでカウンタを 1 から上限まで回し、
// 偶数のときは continue で次の繰り返しへスキップし、 奇数だけ console.log で出力する

`),
  tests: [
    {
      name: "stdout が 1/3/5 の 3 行になる",
      expectedStdout: "1\n3\n5",
    },
  ],
  hints: [
    "`if (i % 2 === 0) continue;` で偶数の反復を飛ばします。",
    "そのあと `console.log(i);` を呼びます。",
    "解答例:\n```js\nfor (let i = 1; i <= 6; i++) {\n  if (i % 2 === 0) {\n    continue;\n  }\n  console.log(i);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "ContinueStatement", label: "continue でスキップする" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `for (let i = 1; i <= 6; i++) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
`,
  badSolutions: [
    {
      code: `console.log(1);
console.log(3);
console.log(5);
`,
      description: "ループを使わず 1 行ずつ出力している",
    },
  ],
  mdnSections: [
    { heading: "continue", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/continue", pageTitle: "continue" },
  ],
};
