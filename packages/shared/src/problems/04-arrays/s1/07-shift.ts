import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch04Shift: Assignment = {
  id: "S1-Ch04-07-shift",
  stage: "S1",
  chapterId: "Ch04",
  sequence: 7,
  title: "shift で先頭の要素を取り除く",
  newConcept: "配列.shift() で先頭の要素を取り除く",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`[10, 20, 30]\` を \`nums\` に入れ、 \`shift()\` で **先頭の要素を取り除いて** から \`nums\` を出力してください。

## 期待する出力

\`\`\`
[20,30]
\`\`\`

## ポイント

- \`shift()\` は **先頭** の要素を取り除きます。 pop の逆 (末尾ではなく先頭)。
`,
  starterFiles: singleFile(`// 配列を const の変数に入れる


// 先頭の要素を shift で取り除く


// 取り除いたあとの配列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [20,30] になる",
      expectedStdout: "[20,30]",
    },
  ],
  hints: [
    "先頭を取り除くのは `nums.shift()`。",
    "pop が末尾、 shift が先頭、 と覚えます。",
    "解答例:\n```js\nconst nums = [10, 20, 30];\nnums.shift();\nconsole.log(nums);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "shift", label: "shift を呼ぶ" },
      ],
    },
  },
  solution: `const nums = [10, 20, 30];
nums.shift();
console.log(nums);
`,
};
