import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06CountEven: Assignment = {
  id: "S2-Ch06-11-count-even",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 11,
  title: "for で偶数の個数を数える",
  newConcept: "ループ内でカウンタを増やす",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

配列 \`[1, 4, 7, 8, 2, 5, 6]\` の中の **偶数の個数** を数えて出力してください。

## 期待する出力

\`\`\`
4
\`\`\`

## ポイント

- ループの外で \`let count = 0;\` を準備。
- ループの中で \`if (nums[i] % 2 === 0) { count++; }\`。
- 最後に \`console.log(count);\`。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// 件数を入れる let の変数を 0 で初期化する


// for ループで全要素を走査し、 偶数のときだけ件数を 1 増やす


// 件数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 4 になる",
      expectedStdout: "4",
    },
  ],
  hints: [
    "`let count = 0;` で初期化し、 ループ内で `count++` を増やします。",
    "if の条件は `nums[i] % 2 === 0`。",
    "解答例:\n```js\nconst nums = [1, 4, 7, 8, 2, 5, 6];\nlet count = 0;\nfor (let i = 0; i < nums.length; i++) {\n  if (nums[i] % 2 === 0) {\n    count++;\n  }\n}\nconsole.log(count);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 4 }, label: "計算せず答えを直接出力しない" },
      ],
    },
  },
  solution: `const nums = [1, 4, 7, 8, 2, 5, 6];
let count = 0;
for (let i = 0; i < nums.length; i++) {
  if (nums[i] % 2 === 0) {
    count++;
  }
}
console.log(count);
`,
  badSolutions: [
    {
      code: `console.log(4);
`,
      description: "ループを使わず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
