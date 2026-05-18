import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04Flat: Assignment = {
  id: "S2-Ch04-10-flat",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 10,
  title: "flat で二重配列を平らにする",
  newConcept: "flat() は配列のネストを 1 段ほどく",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

二重配列 \`[[1, 2], [3, 4], [5]]\` を \`flat\` で 1 段平らにして \`[1, 2, 3, 4, 5]\` を出力してください。

## 期待する出力

\`\`\`
[1,2,3,4,5]
\`\`\`

## ポイント

- \`arr.flat()\` は 1 段だけネストを解消します。
- 深くネストしているなら \`flat(Infinity)\` または \`flat(2)\` 等で深さ指定できます。
`,
  starterFiles: singleFile(`// 入れ子の配列を const の変数に入れる


// その配列に対して flat を呼んで 1 段平らにした結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [1,2,3,4,5] になる",
      expectedStdout: "[1,2,3,4,5]",
    },
  ],
  hints: [
    "`nested.flat()` で 1 段平らにします。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst nested = [[1, 2], [3, 4], [5]];\nconsole.log(nested.flat());\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "flat", label: "flat を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const nested = [[1, 2], [3, 4], [5]];
console.log(nested.flat());
`,
  badSolutions: [
    {
      code: `console.log([1, 2, 3, 4, 5]);
`,
      description: "flat を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.flat()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/flat", pageTitle: "Array.prototype.flat()" },
  ],
};
