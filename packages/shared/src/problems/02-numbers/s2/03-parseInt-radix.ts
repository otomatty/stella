import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02ParseIntRadix: Assignment = {
  id: "S2-Ch02-03-parseInt-radix",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 3,
  title: "parseInt の基数で 16 進数を読み取る",
  newConcept: "parseInt の第 2 引数で進数を指定できる",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

色コード \`"ff"\` を **16 進数として** 読み取って、 その 10 進数表現を出力してください。

\`\`\`js
const hex = "ff";
\`\`\`

## 期待する出力

\`\`\`
255
\`\`\`

## ポイント

- \`parseInt("ff", 16)\` → \`255\` (16 進数 \`ff\` = 10 進数 255)
- 基数を変えれば 2 進数 (\`2\`) や 8 進数 (\`8\`) も読み取れます。
`,
  starterFiles: singleFile(`// 16 進数を表す文字列を const の変数に入れる


// parseInt の第 2 引数に基数を指定して整数に変換し、 別の const の変数に入れる


// 変換後の値を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 255 になる",
      expectedStdout: "255",
    },
  ],
  hints: [
    "基数とは「何進数で読むか」 を指定する数字です。 今回は 16 進数なので `16`。",
    "`parseInt(hex, 16)` の結果を `console.log` に渡します。",
    "解答例:\n```js\nconst hex = \"ff\";\nconst n = parseInt(hex, 16);\nconsole.log(n);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "hex", label: "const hex を宣言する" },
        { kind: "const-declaration", name: "n", label: "const n を宣言する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 255 }, label: "答えを数値リテラルで直接書かない" },
      ],
    },
  },
  solution: `const hex = "ff";
const n = parseInt(hex, 16);
console.log(n);
`,
  badSolutions: [
    {
      code: `console.log(255);
`,
      description: "parseInt を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "parseInt", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/parseInt", pageTitle: "parseInt" },
  ],
};
