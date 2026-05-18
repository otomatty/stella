import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01ConstArray: Assignment = {
  id: "S1-Ch01-12-const-array",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 12,
  title: "const に配列を入れて要素を取り出す",
  newConcept: "const は配列も保持できる。 配列は [ ] で書く",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const colors = ["red", "green", "blue"];\` のように **3 色の配列** を作り、 最初の要素 (= \`colors[0]\`) を出力してください。

## 期待する出力

\`\`\`
red
\`\`\`

## ポイント

- 配列は \`[ ]\` で複数の値を並べて作ります。
- 最初の要素は **0 番目** で、 \`colors[0]\` で取り出せます。
- 配列の詳しい使い方は Ch04 で扱います。
`,
  starterFiles: singleFile(`// 3 つの色の文字列を [ ] で並べた配列を const の変数に入れる


// 配列の最初の要素 (添字 0) を console.log で出力する

`),
  tests: [
    {
      name: "stdout が red になる",
      expectedStdout: "red",
    },
  ],
  hints: [
    "配列は `[要素1, 要素2, 要素3]` の形で書きます。",
    "配列の要素は **0 番目から** 数えます。 一番最初は `colors[0]` です。",
    "解答例:\n```js\nconst colors = [\"red\", \"green\", \"blue\"];\nconsole.log(colors[0]);\n```",
  ],
  solution: `const colors = ["red", "green", "blue"];
console.log(colors[0]);
`,
};
