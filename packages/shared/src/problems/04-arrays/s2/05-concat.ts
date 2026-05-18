import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04Concat: Assignment = {
  id: "S2-Ch04-05-concat",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 5,
  title: "concat で配列を結合する",
  newConcept: "concat は配列同士を連結した新しい配列を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

2 つの配列 \`[1, 2]\` と \`[3, 4]\` を \`concat\` でつなげて、 \`[1, 2, 3, 4]\` を出力してください。

## 期待する出力

\`\`\`
[1,2,3,4]
\`\`\`

## ポイント

- \`a.concat(b)\` で配列 a の後ろに b をつなげた **新しい配列** が返ります。
- 元の \`a\` と \`b\` は変更されません。
`,
  starterFiles: singleFile(`// 2 つの配列を、 それぞれ const の変数に入れる


// 1 つ目の配列に対して concat を呼び、 2 つ目の配列を結合した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [1,2,3,4] になる",
      expectedStdout: "[1,2,3,4]",
    },
  ],
  hints: [
    "`a.concat(b)` で結合した配列が返ります。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst a = [1, 2];\nconst b = [3, 4];\nconsole.log(a.concat(b));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "concat", label: "concat を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const a = [1, 2];
const b = [3, 4];
console.log(a.concat(b));
`,
  badSolutions: [
    {
      code: `console.log([1, 2, 3, 4]);
`,
      description: "concat を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.concat()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/concat", pageTitle: "Array.prototype.concat()" },
  ],
};
