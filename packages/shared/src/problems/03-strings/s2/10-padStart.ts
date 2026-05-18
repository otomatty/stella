import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03PadStart: Assignment = {
  id: "S2-Ch03-10-padStart",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 10,
  title: "padStart で 0 埋めする",
  newConcept: "padStart は左側を指定文字で埋めて固定幅にする",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

数字 \`7\` を **左側を 0 で埋めて 3 桁** の文字列 \`"007"\` にして出力してください。

\`String(7)\` で文字列にしてから \`padStart(3, "0")\` を使います。

## 期待する出力

\`\`\`
007
\`\`\`

## ポイント

- \`"7".padStart(3, "0")\` → \`"007"\`
- 第 1 引数: 仕上げたい桁数。 第 2 引数: 埋める文字。
- 数値を直接 \`.padStart\` できないので、 まず文字列に変換します。
`,
  starterFiles: singleFile(`// 数値を const の変数に入れる


// String(数値) で文字列化してから padStart で 0 を埋めた結果を、
// 別の const の変数に入れる


// その変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 007 になる",
      expectedStdout: "007",
    },
  ],
  hints: [
    "数値を `String(n)` で文字列にしてから padStart を呼びます。",
    "`String(7).padStart(3, \"0\")` で `\"007\"` が得られます。",
    "解答例:\n```js\nconst n = 7;\nconst padded = String(n).padStart(3, \"0\");\nconsole.log(padded);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "padStart", label: "padStart を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const n = 7;
const padded = String(n).padStart(3, "0");
console.log(padded);
`,
  badSolutions: [
    {
      code: `console.log("007");
`,
      description: "padStart を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.padStart()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/padStart", pageTitle: "String.prototype.padStart()" },
  ],
};
