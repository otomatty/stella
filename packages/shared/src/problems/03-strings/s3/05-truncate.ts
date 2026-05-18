import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch03Truncate: Assignment = {
  id: "S3-Ch03-05-truncate",
  stage: "S3",
  chapterId: "Ch03",
  sequence: 5,
  title: "長すぎる文字列を ... で省略する",
  newConcept: "条件分岐で文字列を整形する",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  description: `## やること

文字列 \`s\` と最大文字数 \`max\` を受け取り、 \`s\` が \`max\` 文字以下ならそのまま返し、 超える場合は **先頭 \`max\` 文字 + \`"..."\`** にして返す関数 \`truncate\` を実装してください。

\`\`\`js
truncate("hello", 5);          // → "hello"     (ちょうど max)
truncate("hello world", 5);    // → "hello..."  (max を超えるので省略)
truncate("hi", 10);            // → "hi"        (短い)
truncate("abcdefg", 3);        // → "abc..."
\`\`\`

## ポイント

- \`s.length <= max\` なら \`s\` をそのまま返す。
- そうでなければ \`s.slice(0, max) + "..."\`。
`,
  starterFiles: singleFile(`function truncate(s, max) {
  // ここを実装してください
}
`),
  entryPoints: ["truncate"],
  demoCall: `console.log(truncate("hello world", 5));`,
  tests: [
    { name: 'truncate("hello", 5) は "hello"', code: `truncate("hello", 5) === "hello"` },
    { name: 'truncate("hello world", 5) は "hello..."', code: `truncate("hello world", 5) === "hello..."` },
    { name: 'truncate("hi", 10) は "hi"', code: `truncate("hi", 10) === "hi"` },
    { name: 'truncate("abcdefg", 3) は "abc..."', code: `truncate("abcdefg", 3) === "abc..."` },
    { name: 'truncate("", 5) は ""', code: `truncate("", 5) === ""` },
  ],
  hints: [
    "境界条件: ちょうど `max` 文字のときは省略しない。",
    "解答例:\n```js\nfunction truncate(s, max) {\n  if (s.length <= max) return s;\n  return s.slice(0, max) + \"...\";\n}\n```",
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
  solution: `function truncate(s, max) {
  if (s.length <= max) {
    return s;
  }
  return s.slice(0, max) + "...";
}
`,
  badSolutions: [
    {
      code: `function truncate(s, max) {
  return s.slice(0, max) + "...";
}
`,
      description: "短い文字列にも ... を付けてしまう (hi → hi...)",
    },
    {
      code: `function truncate(s, max) {
  return s;
}
`,
      description: "省略していない",
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
