import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04Includes: Assignment = {
  id: "S2-Ch04-02-includes",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 2,
  title: "includes で要素の有無を判定する",
  newConcept: "配列の includes は要素が含まれるか",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`[1, 3, 5, 7, 9]\` に \`5\` が含まれるかを \`includes\` で判定し、 結果を出力してください。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`arr.includes(値)\` で \`true\` / \`false\` が返ります。
- 「存在チェック」 だけが目的なら \`indexOf !== -1\` より \`includes\` の方が読みやすいです。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// その配列に対して includes で対象要素を含むかを判定した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "`nums.includes(5)` で含まれるかを判定します。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst nums = [1, 3, 5, 7, 9];\nconsole.log(nums.includes(5));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "includes", label: "includes を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const nums = [1, 3, 5, 7, 9];
console.log(nums.includes(5));
`,
  badSolutions: [
    {
      code: `console.log(true);
`,
      description: "includes を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.includes()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/includes", pageTitle: "Array.prototype.includes()" },
  ],
};
