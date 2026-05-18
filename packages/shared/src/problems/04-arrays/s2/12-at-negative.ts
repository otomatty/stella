import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04AtNegative: Assignment = {
  id: "S2-Ch04-12-at-negative",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 12,
  title: "at(-1) で末尾の要素を取る",
  newConcept: "at は負の添字で末尾から取り出せる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`[10, 20, 30, 40]\` の **末尾の要素** (\`40\`) を \`at(-1)\` で取り出して出力してください。

## 期待する出力

\`\`\`
40
\`\`\`

## ポイント

- \`arr[arr.length - 1]\` でも末尾は取れますが、 \`arr.at(-1)\` の方が **意図が明確** です。
- 同様に \`at(-2)\` で末尾から 2 番目を取れます。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// その配列に対して at に負の添字を渡し、 末尾から数えた要素を取り出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 40 になる",
      expectedStdout: "40",
    },
  ],
  hints: [
    "`nums.at(-1)` で末尾要素が返ります。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst nums = [10, 20, 30, 40];\nconsole.log(nums.at(-1));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "at", label: "at を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const nums = [10, 20, 30, 40];
console.log(nums.at(-1));
`,
  badSolutions: [
    {
      code: `console.log(40);
`,
      description: "at を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.at()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/at", pageTitle: "Array.prototype.at()" },
  ],
};
