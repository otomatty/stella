import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04PrintArray: Assignment = {
  id: "S1-Ch04-08-print-array",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 8,
  title: "配列をそのまま console.log で出す",
  newConcept: "配列を console.log に渡すと中身がまとめて表示される",
  estimatedMinutes: 4,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`["apple", "banana"]\` を \`fruits\` に入れ、 配列をそのまま console.log で出力してください。

## 期待する出力

\`\`\`
["apple","banana"]
\`\`\`

## ポイント

- 添字や length と違って、 配列そのものを渡すと **要素全体** が表示されます。
- ループはまだ習っていませんが、 ループを使わなくても配列の中身を一度に見ることができます。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// その変数を、 添字を指定せずにそのまま console.log で出力する

`),
  tests: [
    {
      name: "stdout が [\"apple\",\"banana\"] になる",
      expectedStdout: '["apple","banana"]',
    },
  ],
  hints: [
    "配列を `console.log` に渡すと、 中身がまとめて表示されます。",
    "添字を指定する必要はなく、 `console.log(fruits)` だけで OK。",
    "解答例:\n```js\nconst fruits = [\"apple\", \"banana\"];\nconsole.log(fruits);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "fruits" },
          label: "fruits 変数を console.log に渡す",
        },
      ],
    },
  },
  solution: `const fruits = ["apple", "banana"];
console.log(fruits);
`,
  mdnSections: [
    { heading: "配列の使い方" },
  ],
};
