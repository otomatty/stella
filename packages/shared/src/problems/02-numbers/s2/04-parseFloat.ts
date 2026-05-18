import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02ParseFloat: Assignment = {
  id: "S2-Ch02-04-parseFloat",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 4,
  title: "parseFloat で小数を取り出す",
  newConcept: "parseFloat は小数を含む文字列を数値化する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"3.14kg"\` から \`parseFloat\` で小数 \`3.14\` を取り出して出力してください。

\`\`\`js
const text = "3.14kg";
\`\`\`

## 期待する出力

\`\`\`
3.14
\`\`\`

## ポイント

- \`parseFloat\` は小数点を含む数字を読み取ります。 \`parseInt\` だと小数点以下が落ちます。
- \`parseFloat\` には基数の引数はありません (常に 10 進数)。
`,
  starterFiles: singleFile(`// 小数+単位の文字列を const の変数に入れる


// その変数を parseFloat で小数として読み取り、 別の const の変数に入れる


// 変換後の値を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 3.14 になる",
      expectedStdout: "3.14",
    },
  ],
  hints: [
    "`parseFloat(値)` の形で呼び出します。 基数は不要です。",
    "結果は数値の `3.14` です。 `console.log(3.14)` と同じになります。",
    "解答例:\n```js\nconst text = \"3.14kg\";\nconst n = parseFloat(text);\nconsole.log(n);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "text", label: "const text を宣言する" },
        { kind: "const-declaration", name: "n", label: "const n を宣言する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 3.14 }, label: "答えを数値リテラルで直接書かない" },
      ],
    },
  },
  solution: `const text = "3.14kg";
const n = parseFloat(text);
console.log(n);
`,
  badSolutions: [
    {
      code: `console.log(3.14);
`,
      description: "parseFloat を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "parseFloat", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/parseFloat", pageTitle: "parseFloat" },
  ],
};
