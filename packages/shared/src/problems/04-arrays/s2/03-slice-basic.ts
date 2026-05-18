import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04SliceBasic: Assignment = {
  id: "S2-Ch04-03-slice-basic",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 3,
  title: "slice で部分配列を取り出す",
  newConcept: "slice(start, end) は部分配列を返す (end は含まれない)",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`[10, 20, 30, 40, 50]\` から **添字 1 〜 3 の手前** (= \`[20, 30, 40]\`) を \`slice\` で取り出して出力してください。

## 期待する出力

\`\`\`
[20,30,40]
\`\`\`

## ポイント

- \`arr.slice(1, 4)\` → 添字 1, 2, 3 を取り出す ( **添字 4 は含まれない** )。
- \`slice\` は元の配列を **書き換えません**。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// その配列に対して slice(start, end) で部分配列を取り出した結果を console.log で出力する
// (end は含まれない)

`),
  tests: [
    {
      name: "stdout が [20,30,40] になる",
      expectedStdout: "[20,30,40]",
    },
  ],
  hints: [
    "`nums.slice(1, 4)` で添字 1〜3 を取り出します。 4 は含まれません。",
    "戻り値の配列を `console.log` に渡します。",
    "解答例:\n```js\nconst nums = [10, 20, 30, 40, 50];\nconsole.log(nums.slice(1, 4));\n```",
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
  solution: `const nums = [10, 20, 30, 40, 50];
console.log(nums.slice(1, 4));
`,
  badSolutions: [
    {
      code: `console.log([20, 30, 40]);
`,
      description: "slice を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.slice()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/slice", pageTitle: "Array.prototype.slice()" },
  ],
};
