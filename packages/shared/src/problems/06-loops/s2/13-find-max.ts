import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06FindMax: Assignment = {
  id: "S2-Ch06-13-find-max",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 13,
  title: "for で配列の最大値を求める",
  newConcept: "現時点の最大を保持しながら全要素を見る",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

配列 \`[3, 1, 8, 4, 7]\` の **最大値** を for ループで求めて出力してください。

\`Math.max\` は使わず、 ループで実装します (実務でも値の中身を見ながら処理する基本パターン)。

## 期待する出力

\`\`\`
8
\`\`\`

## ポイント

- 最大値用の変数を 1 要素目で初期化: \`let max = nums[0];\`
- ループの中で「現在の max より大きければ更新」 を繰り返します。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// 最大値を入れる let の変数を、 配列の先頭要素で初期化する


// for ループで添字 1 から length 未満まで回し、
// 現在の要素が最大より大きければ最大を更新する


// 最大値を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 8 になる",
      expectedStdout: "8",
    },
  ],
  hints: [
    "`let max = nums[0];` で 1 要素目を初期値に。",
    "ループの中で `if (nums[i] > max) max = nums[i];` を繰り返します。",
    "解答例:\n```js\nconst nums = [3, 1, 8, 4, 7];\nlet max = nums[0];\nfor (let i = 1; i < nums.length; i++) {\n  if (nums[i] > max) {\n    max = nums[i];\n  }\n}\nconsole.log(max);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "max", label: "Math.max は使わない (ループで実装する)" },
      ],
    },
  },
  solution: `const nums = [3, 1, 8, 4, 7];
let max = nums[0];
for (let i = 1; i < nums.length; i++) {
  if (nums[i] > max) {
    max = nums[i];
  }
}
console.log(max);
`,
  badSolutions: [
    {
      code: `console.log(8);
`,
      description: "ループを使わず答えを直接書いている",
    },
    {
      code: `const nums = [3, 1, 8, 4, 7];
console.log(Math.max(...nums));
`,
      description: "Math.max を使っている (ループで実装すること)",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
