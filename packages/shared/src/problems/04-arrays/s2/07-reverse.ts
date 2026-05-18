import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04Reverse: Assignment = {
  id: "S2-Ch04-07-reverse",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 7,
  title: "reverse で配列を逆順にする",
  newConcept: "reverse は元の配列を破壊的に反転する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`[1, 2, 3, 4, 5]\` を \`reverse\` で逆順にして出力してください。

## 期待する出力

\`\`\`
[5,4,3,2,1]
\`\`\`

## ポイント

- \`arr.reverse()\` は **元の配列を書き換えます** (破壊的)。
- 元配列を残したいときは \`arr.slice().reverse()\` のようにコピーしてから呼びます。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// その配列に対して reverse を呼び、 順序を反転させる (元の配列が書き換わる)


// 反転後の配列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [5,4,3,2,1] になる",
      expectedStdout: "[5,4,3,2,1]",
    },
  ],
  hints: [
    "`nums.reverse()` を呼ぶと `nums` 自体が書き換わります。",
    "その後 `console.log(nums)` で反転後の配列を出力します。",
    "解答例:\n```js\nconst nums = [1, 2, 3, 4, 5];\nnums.reverse();\nconsole.log(nums);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "reverse", label: "reverse を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const nums = [1, 2, 3, 4, 5];
nums.reverse();
console.log(nums);
`,
  badSolutions: [
    {
      code: `console.log([5, 4, 3, 2, 1]);
`,
      description: "reverse を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.reverse()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse", pageTitle: "Array.prototype.reverse()" },
  ],
};
