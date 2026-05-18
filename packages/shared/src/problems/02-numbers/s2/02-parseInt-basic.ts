import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02ParseIntBasic: Assignment = {
  id: "S2-Ch02-02-parseInt-basic",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 2,
  title: "parseInt で文字列から整数を取り出す",
  newConcept: "parseInt は文字列の先頭から整数として読める部分を取り出す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"123円"\` のように **後ろに余計な文字が付いた** 文字列から、 \`parseInt\` で整数 \`123\` を取り出して出力してください。

\`\`\`js
const text = "123円";
\`\`\`

第 2 引数 \`10\` (10 進数) を必ず指定してください。

## 期待する出力

\`\`\`
123
\`\`\`

## ポイント

- \`parseInt("123円", 10)\` → \`123\`
- \`Number("123円")\` だと \`NaN\` になります。 \`parseInt\` は「数字として読める部分まで」 を切り取ります。
- 第 2 引数は **基数** (10 進数なら \`10\`)。 省略は非推奨です。
`,
  starterFiles: singleFile(`// 数字+単位の文字列を const の変数に入れる


// その変数を parseInt で 10 進数として整数に変換し、 別の const の変数に入れる


// 変換後の値を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 123 になる",
      expectedStdout: "123",
    },
  ],
  hints: [
    "`parseInt(値, 基数)` の形で呼び出します。",
    "10 進数なら基数は `10` です。 `parseInt(text, 10)` と書きます。",
    "解答例:\n```js\nconst text = \"123円\";\nconst n = parseInt(text, 10);\nconsole.log(n);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "text", label: "const text を宣言する" },
        { kind: "const-declaration", name: "n", label: "const n を宣言する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 123 }, label: "答えを数値リテラルで直接書かない" },
      ],
    },
  },
  solution: `const text = "123円";
const n = parseInt(text, 10);
console.log(n);
`,
  badSolutions: [
    {
      code: `console.log(123);
`,
      description: "parseInt を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "parseInt", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/parseInt", pageTitle: "parseInt" },
  ],
};
