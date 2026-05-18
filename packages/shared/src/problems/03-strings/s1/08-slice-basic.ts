import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03SliceBasic: Assignment = {
  id: "S1-Ch03-08-slice-basic",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 8,
  title: "slice で文字列の途中以降を取り出す",
  newConcept: "文字列.slice(開始) で開始位置から最後までを取り出す",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"Hello, World"\` の **7 文字目から最後まで** を取り出して出力してください。

\`slice(開始位置)\` を使うと、 その位置から末尾までを取り出せます。 位置は **0 から数えます**。

## 期待する出力

\`\`\`
World
\`\`\`

## ポイント

- インデックスは 0 から始まります。 \`"Hello, World"\` の 0 番目は \`H\`、 7 番目は \`W\`。
- \`"Hello, World".slice(7)\` は \`"World"\` を返します。
`,
  starterFiles: singleFile(`// 説明文の文字列に slice を使い、 説明文で指定された開始位置以降を取り出して console.log で出力する

`),
  tests: [
    {
      name: "stdout が World になる",
      expectedStdout: "World",
    },
  ],
  hints: [
    "`slice(開始)` は開始位置から末尾までを返します。",
    "`H` が 0 番目、 `W` は 7 番目です (`H,e,l,l,o,カンマ,スペース,W`)。",
    "解答例:\n```js\nconsole.log(\"Hello, World\".slice(7));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "slice", label: "slice を呼ぶ" },
      ],
    },
  },
  solution: `console.log("Hello, World".slice(7));
`,
  badSolutions: [
    {
      code: `console.log("World");
`,
      description: "slice を使わず文字列を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.slice()" },
  ],
};
