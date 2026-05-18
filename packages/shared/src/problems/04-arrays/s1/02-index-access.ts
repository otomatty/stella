import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04IndexAccess: Assignment = {
  id: "S1-Ch04-02-index-access",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 2,
  title: "配列の要素を添字で取り出す",
  newConcept: "配列[インデックス] で要素を取り出す。 0 から数える",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const fruits = ["りんご", "みかん", "ぶどう"];\` のような配列を作り、 **2 番目の要素** (= \`"みかん"\`) を出力してください。

## 期待する出力

\`\`\`
みかん
\`\`\`

## ポイント

- 配列の **最初の要素は 0 番目** です。 2 番目は \`fruits[1]\`。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// 添字で 2 番目の要素 ([1]) を取り出して console.log で出力する
// (添字は 0 から数える)

`),
  tests: [
    {
      name: "stdout が みかん になる",
      expectedStdout: "みかん",
    },
  ],
  hints: [
    "添字は 0 から始まります。 `fruits[0]` が `\"りんご\"`、 `fruits[1]` が `\"みかん\"`。",
    "`console.log(fruits[1]);` で `\"みかん\"` が出ます。",
    "解答例:\n```js\nconst fruits = [\"りんご\", \"みかん\", \"ぶどう\"];\nconsole.log(fruits[1]);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "fruits",
          label: "const fruits を宣言する",
        },
      ],
    },
  },
  solution: `const fruits = ["りんご", "みかん", "ぶどう"];
console.log(fruits[1]);
`,
  mdnSections: [
    { heading: "配列要素へのアクセス" },
  ],
};
