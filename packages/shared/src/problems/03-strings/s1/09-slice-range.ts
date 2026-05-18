import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03SliceRange: Assignment = {
  id: "S1-Ch03-09-slice-range",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 9,
  title: "slice で範囲を指定して取り出す",
  newConcept: "slice(開始, 終了) で範囲指定して取り出す",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"JavaScript"\` の **0 文字目から 4 文字目まで** (= \`"Java"\`) を取り出して出力してください。

\`slice(開始, 終了)\` の **終了位置は含まれません**。 例: \`slice(0, 4)\` は 0, 1, 2, 3 番目を取り出します。

## 期待する出力

\`\`\`
Java
\`\`\`
`,
  starterFiles: singleFile(`// 説明文の文字列に slice を使い、 開始位置と終了位置を指定して範囲を取り出して console.log で出力する
// (終了位置の文字は含まれない点に注意)

`),
  tests: [
    {
      name: "stdout が Java になる",
      expectedStdout: "Java",
    },
  ],
  hints: [
    "`slice(開始, 終了)` は **終了位置を含みません**。 終了 4 なら 0,1,2,3 の 4 文字。",
    "`\"JavaScript\".slice(0, 4)` で `\"Java\"` が返ります。",
    "解答例:\n```js\nconsole.log(\"JavaScript\".slice(0, 4));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "slice", label: "slice を呼ぶ" },
      ],
    },
  },
  solution: `console.log("JavaScript".slice(0, 4));
`,
  badSolutions: [
    {
      code: `console.log("Java");
`,
      description: "slice を使わず文字列を直接書いている",
    },
  ],
};
