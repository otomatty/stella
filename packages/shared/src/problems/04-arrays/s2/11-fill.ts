import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04Fill: Assignment = {
  id: "S2-Ch04-11-fill",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 11,
  title: "fill で配列を同じ値で埋める",
  newConcept: "fill(値) は配列の中身を破壊的に書き換える",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`new Array(5)\` で **長さ 5 の空配列** を作り、 \`fill(0)\` で \`[0, 0, 0, 0, 0]\` にして出力してください。

## 期待する出力

\`\`\`
[0,0,0,0,0]
\`\`\`

## ポイント

- \`new Array(n)\` は長さ n の「空き」 (sparse) 配列。
- \`fill(値)\` で中身を一気に書き換えます。
- 「ゼロで初期化された長さ N の配列」 を作る定番イディオムです。
`,
  starterFiles: singleFile(`// new Array(長さ).fill(値) で同じ値を埋めた配列を作り、 const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が [0,0,0,0,0] になる",
      expectedStdout: "[0,0,0,0,0]",
    },
  ],
  hints: [
    "`new Array(5).fill(0)` で長さ 5 の `0` 配列が作れます。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst zeros = new Array(5).fill(0);\nconsole.log(zeros);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "fill", label: "fill を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const zeros = new Array(5).fill(0);
console.log(zeros);
`,
  badSolutions: [
    {
      code: `console.log([0, 0, 0, 0, 0]);
`,
      description: "fill を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.fill()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/fill", pageTitle: "Array.prototype.fill()" },
  ],
};
