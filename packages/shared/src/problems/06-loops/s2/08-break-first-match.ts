import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06BreakFirstMatch: Assignment = {
  id: "S2-Ch06-08-break-first-match",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 8,
  title: "break で最初の偶数を見つけたら抜ける",
  newConcept: "break はそのループを途中で抜ける",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

配列 \`[3, 7, 4, 9, 6]\` をループで巡り、 **最初に見つかった偶数** を出力してループを抜けてください (break)。

## 期待する出力

\`\`\`
4
\`\`\`

## ポイント

- \`break;\` はそのループを即座に終了します。
- 「探索して最初の 1 つだけ欲しい」 ときに使います。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// for ループで先頭から走査し、 条件を満たす要素を見つけたら
// その値を console.log で出力して break でループを抜ける

`),
  tests: [
    {
      name: "stdout が 4 になる",
      expectedStdout: "4",
    },
  ],
  hints: [
    "ループの中で `nums[i] % 2 === 0` を判定し、 真なら出力して `break;`。",
    "break を入れないと全偶数が出力されてしまいます。",
    "解答例:\n```js\nconst nums = [3, 7, 4, 9, 6];\nfor (let i = 0; i < nums.length; i++) {\n  if (nums[i] % 2 === 0) {\n    console.log(nums[i]);\n    break;\n  }\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "IfStatement", label: "if で偶数判定する" },
        { kind: "node", nodeType: "BreakStatement", label: "break で抜ける" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const nums = [3, 7, 4, 9, 6];
for (let i = 0; i < nums.length; i++) {
  if (nums[i] % 2 === 0) {
    console.log(nums[i]);
    break;
  }
}
`,
  badSolutions: [
    {
      code: `console.log(4);
`,
      description: "ループを使わず答えを直接書いている",
    },
  ],
  mdnSections: [
    { heading: "break", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/break", pageTitle: "break" },
  ],
};
