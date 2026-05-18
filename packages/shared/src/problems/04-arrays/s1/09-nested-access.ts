import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04NestedAccess: Assignment = {
  id: "S1-Ch04-09-nested-access",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 9,
  title: "配列の中の配列にアクセスする",
  newConcept: "配列の要素が配列のとき、 [i][j] で中の値を取り出す",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`const matrix = [[1, 2], [3, 4]];\` のような配列を作り、 **真ん中右下** の値 (= \`4\`) を出力してください。

\`matrix[0]\` は \`[1, 2]\`、 \`matrix[1]\` は \`[3, 4]\`。 そこからさらに \`[1]\` を取ると 4。

## 期待する出力

\`\`\`
4
\`\`\`
`,
  starterFiles: singleFile(`// 入れ子の配列 (要素が配列) を const の変数に入れる


// 添字を 2 つ並べて内側の要素を取り出し、 console.log で出力する
// (まず外側の添字で内側の配列、 次にその添字で値を取り出す)

`),
  tests: [
    {
      name: "stdout が 4 になる",
      expectedStdout: "4",
    },
  ],
  hints: [
    "配列の要素が配列のとき、 添字を 2 つ並べて書きます: `matrix[1][1]`。",
    "`matrix[1]` で `[3, 4]` を取り出してから、 `[1]` で 4 を取り出します。",
    "解答例:\n```js\nconst matrix = [[1, 2], [3, 4]];\nconsole.log(matrix[1][1]);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "matrix",
          label: "const matrix を宣言する",
        },
      ],
    },
  },
  solution: `const matrix = [[1, 2], [3, 4]];
console.log(matrix[1][1]);
`,
};
