import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03EndsWith: Assignment = {
  id: "S2-Ch03-07-endsWith",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 7,
  title: "endsWith で末尾一致を確認する",
  newConcept: "endsWith は末尾が指定文字列で終わるか",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

ファイル名 \`"report.pdf"\` が \`".pdf"\` で終わるかを判定し、 結果を出力してください。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`fileName.endsWith(".pdf")\` で末尾一致を判定できます。
- 拡張子チェックなどでよく使う関数です。
`,
  starterFiles: singleFile(`// ファイル名の文字列を const の変数に入れる


// その変数に対して endsWith で末尾の拡張子を判定した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "`fileName.endsWith(\".pdf\")` で末尾一致を判定します。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst fileName = \"report.pdf\";\nconsole.log(fileName.endsWith(\".pdf\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "endsWith", label: "endsWith を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const fileName = "report.pdf";
console.log(fileName.endsWith(".pdf"));
`,
  badSolutions: [
    {
      code: `console.log(true);
`,
      description: "endsWith を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.endsWith()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith", pageTitle: "String.prototype.endsWith()" },
  ],
};
