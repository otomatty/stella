import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03Capitalize: Assignment = {
  id: "S3-Ch03-04-capitalize",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 4,
  title: "先頭だけ大文字にして残りは小文字にする",
  newConcept: "slice / toUpperCase / toLowerCase を組み合わせる",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

文字列 \`s\` を受け取り、 先頭 1 文字を大文字、 残りを小文字にした文字列を返す関数 \`capitalize\` を実装してください。 空文字列 \`""\` の場合はそのまま \`""\` を返します。

\`\`\`js
capitalize("hello");  // → "Hello"
capitalize("WORLD");  // → "World"
capitalize("a");      // → "A"
capitalize("");       // → ""
\`\`\`

## ポイント

- 先頭は \`s.charAt(0).toUpperCase()\` または \`s[0].toUpperCase()\`。
- 残りは \`s.slice(1).toLowerCase()\`。
- 連結して return。
`,
  starterFiles: singleFile(`function capitalize(s) {
  // ここを実装してください
}
`),
  entryPoints: ["capitalize"],
  demoCall: `console.log(capitalize("hello"));`,
  tests: [
    { name: 'capitalize("hello") は "Hello"', code: `capitalize("hello") === "Hello"` },
    { name: 'capitalize("WORLD") は "World"', code: `capitalize("WORLD") === "World"` },
    { name: 'capitalize("a") は "A"', code: `capitalize("a") === "A"` },
    { name: 'capitalize("") は ""', code: `capitalize("") === ""` },
    { name: 'capitalize("javaScript") は "Javascript"', code: `capitalize("javaScript") === "Javascript"` },
  ],
  hints: [
    "if で空文字列を最初に処理しておくと安全。",
    "解答例:\n```js\nfunction capitalize(s) {\n  if (s.length === 0) return \"\";\n  return s[0].toUpperCase() + s.slice(1).toLowerCase();\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function capitalize(s) {
  if (s.length === 0) {
    return "";
  }
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}
`,
  badSolutions: [
    {
      code: `function capitalize(s) {
  return s.toUpperCase();
}
`,
      description: "全部大文字にしている",
    },
    {
      code: `function capitalize(s) {
  return s[0].toUpperCase() + s.slice(1);
}
`,
      description: "残りを小文字化していない (WORLD → WORLD のまま)",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.slice()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/slice",
      pageTitle: "String.prototype.slice()",
    },
  ],
};
