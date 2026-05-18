import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04SliceNegative: Assignment = {
  id: "S2-Ch04-04-slice-negative",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 4,
  title: "slice に負の数で末尾を取る",
  newConcept: "負の引数は末尾から数える位置を意味する",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

配列 \`[1, 2, 3, 4, 5]\` の **末尾 2 つ** (\`[4, 5]\`) を \`slice(-2)\` で取り出して出力してください。

## 期待する出力

\`\`\`
[4,5]
\`\`\`

## ポイント

- \`slice(-2)\` は **末尾から 2 個** を取り出します。
- \`slice(start, end)\` の \`end\` を省略すると配列の末尾まで取得します。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// その配列に対して slice に負の添字を渡し、 末尾から数えた要素を取り出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [4,5] になる",
      expectedStdout: "[4,5]",
    },
  ],
  hints: [
    "`nums.slice(-2)` で末尾 2 個を取り出します。",
    "戻り値の配列を `console.log` に渡します。",
    "解答例:\n```js\nconst nums = [1, 2, 3, 4, 5];\nconsole.log(nums.slice(-2));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "slice", label: "slice を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const nums = [1, 2, 3, 4, 5];
console.log(nums.slice(-2));
`,
  badSolutions: [
    {
      code: `console.log([4, 5]);
`,
      description: "slice を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.slice()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/slice", pageTitle: "Array.prototype.slice()" },
  ],
};
