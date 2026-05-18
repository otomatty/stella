import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04Unshift: Assignment = {
  id: "S1-Ch04-06-unshift",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 6,
  title: "unshift で先頭に要素を追加する",
  newConcept: "配列.unshift(値) で配列の先頭に要素を追加する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`[2, 3]\` を \`nums\` に入れ、 \`unshift\` で \`1\` を **先頭に追加** してから \`nums\` を出力してください。

## 期待する出力

\`\`\`
[1,2,3]
\`\`\`

## ポイント

- \`unshift(値)\` は配列の **先頭** に値を追加します。 push の逆 (末尾ではなく先頭)。
`,
  starterFiles: singleFile(`// 配列を const の変数に入れる


// 先頭に新しい要素を unshift で追加する


// 追加後の配列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [1,2,3] になる",
      expectedStdout: "[1,2,3]",
    },
  ],
  hints: [
    "先頭追加は `nums.unshift(1)`。",
    "push が末尾、 unshift が先頭、 と覚えます。",
    "解答例:\n```js\nconst nums = [2, 3];\nnums.unshift(1);\nconsole.log(nums);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "unshift", label: "unshift を呼ぶ" },
      ],
    },
  },
  solution: `const nums = [2, 3];
nums.unshift(1);
console.log(nums);
`,
};
