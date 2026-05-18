import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03Includes: Assignment = {
  id: "S2-Ch03-05-includes",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 5,
  title: "includes で部分文字列を確認する",
  newConcept: "includes は部分文字列があれば true",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"Hello, JavaScript!"\` の中に \`"Script"\` が含まれているかを \`includes\` で判定し、 結果を出力してください。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`"Hello".includes("ll")\` → \`true\`
- \`"Hello".includes("xy")\` → \`false\`
- 大文字小文字は区別されます。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数に対して includes で部分文字列を含むかを判定した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "`text.includes(部分文字列)` で `true` / `false` が返ります。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst text = \"Hello, JavaScript!\";\nconsole.log(text.includes(\"Script\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "includes", label: "includes を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const text = "Hello, JavaScript!";
console.log(text.includes("Script"));
`,
  badSolutions: [
    {
      code: `console.log(true);
`,
      description: "includes を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.includes()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/includes", pageTitle: "String.prototype.includes()" },
  ],
};
