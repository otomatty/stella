import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02CompoundAssign: Assignment = {
  id: "S1-Ch02-12-compound-assign",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 12,
  title: "複合代入 (+=) で値を増やす",
  newConcept: "x += n は x = x + n の短い書き方",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

次の手順で合計を増やしてください。

1. \`let total = 100;\` で開始
2. \`total += 50;\` で 50 を加える (= \`total = total + 50\` と同じ)
3. \`total\` を出力する

## 期待する出力

\`\`\`
150
\`\`\`

## ポイント

- \`x += n\` は \`x = x + n\` の **省略形** です。 同じ意味になります。
- 同様に \`-=\`、 \`*=\`、 \`/=\` もあります。
`,
  starterFiles: singleFile(`// let で変数を宣言し、 初期値を入れる


// += を使ってその変数に値を加算する


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 150 になる",
      expectedStdout: "150",
    },
  ],
  hints: [
    "再代入するので `let` を使います。",
    "`total += 50` は `total = total + 50` と同じ意味です。",
    "解答例:\n```js\nlet total = 100;\ntotal += 50;\nconsole.log(total);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "total" },
          label: "total 変数を console.log に渡す",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `let total = 100;
total += 50;
console.log(total);
`,
  badSolutions: [
    {
      code: `console.log(150);
`,
      description: "計算過程を書かずに答えを直接出力している",
    },
  ],
};
