import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03MaskTail: Assignment = {
  id: "S3-Ch03-08-mask-tail",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 8,
  title: "末尾 4 文字以外を * でマスクする",
  newConcept: "slice と repeat を組み合わせて文字列を組み立てる",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  description: `## やること

カード番号などの文字列 \`s\` を受け取り、 **末尾 4 文字以外を \`"*"\` に置き換えた** 文字列を返す関数 \`maskTail\` を実装してください。 4 文字以下の文字列はそのまま返します。

\`\`\`js
maskTail("1234567890123456");  // → "************3456"
maskTail("12345");             // → "*2345"
maskTail("1234");              // → "1234"
maskTail("ab");                // → "ab"
maskTail("");                  // → ""
\`\`\`

## ポイント

- 長さが 4 以下のときは特殊扱い。
- そうでなければ、 \`"*"\` を \`(s.length - 4)\` 回繰り返したものに \`s.slice(-4)\` を連結。
- \`"*".repeat(n)\` でアスタリスクを n 個並べられます。
`,
  starterFiles: singleFile(`function maskTail(s) {
  // ここを実装してください
}
`),
  entryPoints: ["maskTail"],
  demoCall: `console.log(maskTail("1234567890123456"));`,
  tests: [
    { name: 'maskTail("1234567890123456") は "************3456"', code: `maskTail("1234567890123456") === "************3456"` },
    { name: 'maskTail("12345") は "*2345"', code: `maskTail("12345") === "*2345"` },
    { name: 'maskTail("1234") は "1234"', code: `maskTail("1234") === "1234"` },
    { name: 'maskTail("ab") は "ab"', code: `maskTail("ab") === "ab"` },
    { name: 'maskTail("") は ""', code: `maskTail("") === ""` },
  ],
  hints: [
    "末尾 4 文字以外を `*` で置き換える。",
    "解答例:\n```js\nfunction maskTail(s) {\n  if (s.length <= 4) return s;\n  return \"*\".repeat(s.length - 4) + s.slice(-4);\n}\n```",
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
  solution: `function maskTail(s) {
  if (s.length <= 4) {
    return s;
  }
  return "*".repeat(s.length - 4) + s.slice(-4);
}
`,
  badSolutions: [
    {
      code: `function maskTail(s) {
  return "*".repeat(s.length);
}
`,
      description: "末尾 4 文字を残していない (全部 *)",
    },
    {
      code: `function maskTail(s) {
  return "*".repeat(s.length - 4) + s.slice(-4);
}
`,
      description: "短い文字列で repeat(負数) になり空文字+slice の結果になってしまう (12345 → *2345 は OK だが 1234 で 1234, ab で ab.slice(-4) = ab なので一見動く。 しかし length=0 で .repeat(-4) は throw)",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.repeat()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/repeat",
      pageTitle: "String.prototype.repeat()",
    },
  ],
};
