import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03StartsWith: Assignment = {
  id: "S2-Ch03-06-startsWith",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 6,
  title: "startsWith で先頭一致を確認する",
  newConcept: "startsWith は先頭が指定文字列で始まるか",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

URL 文字列 \`"https://example.com"\` が \`"https://"\` で始まるかを判定し、 結果を出力してください。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`url.startsWith("https://")\` で「先頭一致」 を確認できます。
- 似た仲間に \`endsWith\` があります (Ch03-07 で扱います)。
`,
  starterFiles: singleFile(`// URL の文字列を const の変数に入れる


// その変数に対して startsWith でプレフィックスを判定した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "`url.startsWith(\"https://\")` で先頭一致を判定します。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst url = \"https://example.com\";\nconsole.log(url.startsWith(\"https://\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "startsWith", label: "startsWith を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const url = "https://example.com";
console.log(url.startsWith("https://"));
`,
  badSolutions: [
    {
      code: `console.log(true);
`,
      description: "startsWith を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.startsWith()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith", pageTitle: "String.prototype.startsWith()" },
  ],
};
