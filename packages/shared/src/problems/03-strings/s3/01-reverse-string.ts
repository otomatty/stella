import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03ReverseString: Assignment = {
  id: "S3-Ch03-01-reverse-string",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 1,
  title: "文字列を反転する",
  newConcept: "split → reverse → join で文字列を逆順に変換する",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

文字列 \`s\` を受け取り、 その文字を逆順に並べた文字列を返す関数 \`reverseString\` を実装してください。

\`\`\`js
reverseString("hello");  // → "olleh"
reverseString("a");      // → "a"
reverseString("");       // → ""
\`\`\`

## ポイント

- 文字列を \`.split("")\` で 1 文字ずつの配列にし、 \`.reverse()\` で逆順、 \`.join("")\` で結合できます。
- for ループで末尾から 1 文字ずつ連結しても OK です。
`,
  starterFiles: singleFile(`function reverseString(s) {
  // ここを実装してください
}
`),
  entryPoints: ["reverseString"],
  demoCall: `console.log(reverseString("hello"));`,
  tests: [
    { name: 'reverseString("hello") は "olleh"', code: `reverseString("hello") === "olleh"` },
    { name: 'reverseString("a") は "a"', code: `reverseString("a") === "a"` },
    { name: 'reverseString("") は ""', code: `reverseString("") === ""` },
    { name: 'reverseString("abc") は "cba"', code: `reverseString("abc") === "cba"` },
    { name: 'reverseString("12345") は "54321"', code: `reverseString("12345") === "54321"` },
  ],
  hints: [
    "`s.split(\"\").reverse().join(\"\")` のチェーンで一発。",
    "解答例:\n```js\nfunction reverseString(s) {\n  return s.split(\"\").reverse().join(\"\");\n}\n```",
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
  solution: `function reverseString(s) {
  return s.split("").reverse().join("");
}
`,
  badSolutions: [
    {
      code: `function reverseString(s) {
  return s;
}
`,
      description: "そのまま返している",
    },
    {
      code: `function reverseString(s) {
  return s.split("").reverse();
}
`,
      description: "join していないので配列が返る",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reverse()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse",
      pageTitle: "Array.prototype.reverse()",
    },
  ],
};
